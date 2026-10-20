# LiveKit Voice Agent — Real-Time Voice over WebRTC

**A WebRTC voice agent that uses LiveKit for the real-time media loop and NeuroLink as the brain (LLM, tools, memory).**

---

## Table of Contents

1. [Problem Statement & Solution](#problem-statement--solution)
2. [Architecture Overview](#architecture-overview)
3. [Deployment Topologies (Cloud & Self-Hosted)](#deployment-topologies-cloud--self-hosted)
4. [Core Components](#core-components)
5. [How NeuroLink Owns the Brain](#how-neurolink-owns-the-brain)
6. [Runtime Flow](#runtime-flow)
7. [Usage Example](#usage-example)
8. [Source Layout](#source-layout)
9. [Configuration](#configuration)
10. [Tuning the Voice Loop (VAD, Turn Detection, Interruption, Language)](#tuning-the-voice-loop-vad-turn-detection-interruption-language)
11. [Conversation Memory](#conversation-memory)
12. [Realtime Speech-to-Speech Backends (Gemini Live and xAI Grok Voice)](#realtime-speech-to-speech-backends-gemini-live-and-xai-grok-voice)
13. [Implementation Plan](#implementation-plan)
14. [Operational Behavior](#operational-behavior)
15. [Error Handling & Troubleshooting](#error-handling--troubleshooting)
16. [Extensibility Roadmap](#extensibility-roadmap)

---

## Problem Statement & Solution

### The Challenge

The original NeuroLink voice agent (see `voice-agent.md`) runs a browser-to-server loop over a **WebSocket**. That design works, but a WebSocket transport carries structural limits for real-time audio:

- TCP head-of-line blocking and no jitter buffer cause choppy audio on lossy networks
- no built-in acoustic echo cancellation — the assistant can be transcribed by its own mic input
- raw PCM is ~8–10× the bandwidth of a compressed codec, and all of it flows through the application server
- voice-activity detection runs on the application server's event loop, capping per-process concurrency
- SvelteKit and similar frameworks cannot accept the WebSocket upgrade without a custom server entry

### The Solution

The LiveKit voice agent moves the transport to **WebRTC via LiveKit**, while keeping **NeuroLink as the brain**. LiveKit (an open-source WebRTC platform with a managed cloud and a self-hostable server) provides the parts that are hard to build correctly:

- WebRTC transport with echo cancellation, jitter buffering, packet-loss concealment, and Opus compression
- voice-activity detection, turn detection, and interruption handling
- a worker/job model that runs **each call in its own process** for isolation and horizontal scaling

NeuroLink remains responsible for the conversation itself:

- the LLM (any NeuroLink provider — Bedrock/Claude, OpenAI, Gemini, etc.)
- tool calling (MCP and registered tools), decided and executed inside `neurolink.stream()`
- conversation memory, keyed by a stable `conversationId`

### Key Benefits

- **Production-grade real-time audio** without building media plumbing
- **NeuroLink stays the brain** — `generate()`/`stream()`, tools, and memory are unchanged
- **Worker-per-call scaling** provided by the LiveKit Agents runtime
- **Cloud or self-hosted** with identical application code
- **Provider-agnostic brain layer** that can later back other transports

---

## Architecture Overview

### System Flow Diagram

```text
┌─────────────────────────────────────────────────────────────┐
│ Browser (livekit-client)                                    │
│ • Captures mic; WebRTC handles AEC, Opus, jitter            │
│ • Plays assistant audio                                     │
└────────────────────────┬────────────────────────────────────┘
                         │  WebRTC
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ LiveKit Server  (Cloud  OR  self-hosted)                    │
│ • Auto-creates the room on first join                       │
│ • Routes media via its SFU                                  │
│ • Dispatches one Job per room to a registered worker        │
└────────────────────────┬────────────────────────────────────┘
                         │  one Job per call (own process)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Voice Agent Worker  (@livekit/agents, Node)                 │
│   Silero VAD ─ turn detection / interruption                │
│   STT plugin (Deepgram) ─ speech → text                     │
│   llmNode  ──────────────►  NeuroLink brain                 │
│   TTS plugin (ElevenLabs/Cartesia) ─ text → speech          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ NeuroLink  (the brain — runs inside llmNode)                │
│ • neurolink.stream({ conversationId })                      │
│ • history  → NeuroLink memory (source of truth)             │
│ • tools    → MCP / registered tools, executed by NeuroLink  │
│ • model    → any NeuroLink provider                         │
└─────────────────────────────────────────────────────────────┘
```

### Division of Responsibility

| Concern                                     | Owner                               |
| ------------------------------------------- | ----------------------------------- |
| WebRTC transport, AEC, jitter, Opus         | LiveKit                             |
| VAD, turn detection, interruption           | LiveKit Agents                      |
| Worker-per-call process isolation & scaling | LiveKit Agents                      |
| STT / TTS                                   | LiveKit plugins (configurable)      |
| LLM, tool-calling, memory                   | NeuroLink                           |
| Conversation history source of truth        | NeuroLink memory (`conversationId`) |

---

## Deployment Topologies (Cloud & Self-Hosted)

The application code is **identical** across topologies; only `LIVEKIT_URL` and credentials change.

### Topology A — LiveKit Cloud (managed)

```text
Browser ──► LiveKit Cloud (rooms + SFU on LiveKit's servers)
Voice Agent Worker (your infra) ──outbound──► LiveKit Cloud   (registers; Cloud dispatches Jobs)
Token endpoint (your app) mints join tokens with the Cloud API key/secret
```

- Rooms are created automatically on LiveKit's servers on first join.
- The worker connects **outbound** to Cloud and receives dispatched Jobs over that connection — no inbound exposure or tunneling is required, even in local development.
- Billing is per participant-minute (a free Build tier is suitable for development).
- **Use when:** fastest setup, minimal media ops, dev/staging, or production without running media infrastructure.

### Topology B — Self-Hosted LiveKit (in-house)

```text
Browser ──► your LiveKit server (rooms + SFU on your infrastructure)
Voice Agent Worker (your infra) ──► your LiveKit server
Token endpoint (your app) mints join tokens with your server's API key/secret
```

- The `livekit-server` (open source) runs on your own infrastructure (for example, Kubernetes behind your ingress/service mesh).
- Media stays inside your network; there is **no per-minute media fee** — you pay only for compute and bandwidth.
- **Use when:** cost control at scale, data-residency/compliance requirements, or full control over the media path.

### Local Development

- **Console mode:** the worker runs standalone using the host machine's microphone and speakers — **no LiveKit server and no browser required**. Best for iterating on the brain loop.
- **Local server:** `livekit-server --dev` (placeholder credentials, no external dependencies) with the browser and worker on `localhost`.
- **Cloud from local:** point local `LIVEKIT_URL` at a Cloud project. Because the worker connects outbound, Cloud can dispatch Jobs to a locally-running worker without tunneling.

---

## Core Components

### 1. LiveKit Agents Worker

A long-lived Node process built on `@livekit/agents`. It registers with the LiveKit server under an `agentName` (for example, `neurolink-voice`). For each room, LiveKit dispatches a **Job**, which the runtime runs in its **own process** — this is the worker-per-call isolation that bounds the blast radius of a crash and enables linear scaling by adding worker replicas.

### 2. Voice Activity Detection & Turn Detection

Provided by the LiveKit Agents `AgentSession` using the Silero VAD plugin plus the framework's turn-detection and interruption logic. This replaces the hand-built VAD/turn/barge-in logic of the WebSocket voice agent.

### 3. Speech-to-Text / Text-to-Speech

LiveKit handles the audio transport and turn-taking, but does **not** perform STT
or TTS itself — those are pluggable provider modules, each its own
`@livekit/agents-plugin-<name>` package configured with that provider's API key
(via environment). Selected through the `stt` / `tts` fields of the agent config.

Available providers (Node SDK, `@livekit/agents-plugin-*` @ 1.4.x):

| Capability | Providers                                                                                                 |
| ---------- | --------------------------------------------------------------------------------------------------------- |
| **STT**    | Deepgram · OpenAI (Whisper) · Google · AssemblyAI · Cartesia · Sarvam · Baseten                           |
| **TTS**    | ElevenLabs · Cartesia · OpenAI · Google · Rime · Neuphonic · Resemble · Inworld · Hume · Sarvam · Baseten |
| **VAD**    | Silero                                                                                                    |

`google` provides both STT and TTS, so a Google/Vertex deployment can use it for
speech on both sides while NeuroLink (Vertex) serves as the brain — without
adding a separate STT/TTS vendor.

> The integration wires provider plugins on demand in `voiceAgent.ts`
> (`buildStt`/`buildTts`). Adding a provider from the list above is a small,
> isolated change in those two functions.

### 4. NeuroLink Brain (`llmNode`)

The `llmNode` is the seam between LiveKit and NeuroLink. It extracts the latest user utterance, calls `neurolink.stream()` with a stable `conversationId`, and returns the token stream as `ReadableStream<llm.ChatChunk>`. Conversation history is **not** taken from LiveKit's `ChatContext`; NeuroLink's memory is the source of truth.

### 5. Token Endpoint

A plain HTTP endpoint in the host application that mints a LiveKit join token (`livekit-server-sdk`) for an authenticated user. Because WebRTC needs only this single HTTP call, frameworks that cannot accept a WebSocket upgrade (such as SvelteKit) integrate without a custom server entry.

### 6. Browser Client

The host application's frontend uses `livekit-client` to join the room, publish the microphone, and play the agent's audio. The browser handles capture, AEC, and playback natively through WebRTC.

---

## How NeuroLink Owns the Brain

This integration is deliberately structured so NeuroLink retains its generic control surface.

### History

The `llmNode` ignores LiveKit's accumulated `ChatContext` for generation and instead passes a stable `conversationId` to `neurolink.stream()`. NeuroLink's memory layer loads and persists history under that id, making NeuroLink the single source of truth for conversation state. LiveKit still maintains its own context internally for turn detection; the two do not conflict because LiveKit's turn detection is audio/transcript-driven.

### Tools

Tools (MCP and registered tools) live on the NeuroLink instance. With tools enabled, NeuroLink runs the entire tool-calling loop inside `stream()` — the model selects a tool, NeuroLink executes it, feeds the result back, and continues. LiveKit performs **no** tool-calling. To make a merchant/MCP toolset available, have the `createNeuroLink` factory return an instance with those tools registered — it is invoked inside each job process to build the brain for that call.

### Model

The model and provider are NeuroLink configuration (`provider`, `model`). Any NeuroLink provider is supported, including Bedrock/Claude.

### Interruption (barge-in)

When LiveKit detects barge-in it cancels the in-flight `llmNode`. That cancellation must be propagated into `neurolink.stream()` via an abort signal so the in-flight LLM call **and any running tool call** stop promptly.

### Tool latency

While a tool runs inside `stream()`, no audio is produced. To avoid dead air, instruct the model to speak a brief acknowledgment before tool use and/or emit a status event over a LiveKit data channel for the UI.

---

## Runtime Flow

### Normal Turn

1. Browser publishes microphone audio to the room (WebRTC).
2. LiveKit Agents detects the end of the user's turn (VAD + turn detection).
3. STT produces the transcript.
4. `llmNode` calls `neurolink.stream({ conversationId, input })`.
5. NeuroLink generates (running any tool calls internally) and streams tokens.
6. TTS converts tokens to audio; LiveKit plays it back in the room.
7. NeuroLink persists the turn to memory under `conversationId`.

### Barge-In / Abort

1. The assistant is speaking.
2. LiveKit detects user speech and cancels the current `llmNode`.
3. The abort signal cancels the in-flight `neurolink.stream()` (and any active tool).
4. The session yields to the user.

---

## Usage Example

> The integration is exposed under `@juspay/neurolink/livekit`.

### Requirements

The `@juspay/neurolink/livekit` entry **requires `@livekit/agents`**. Its
functions take LiveKit's `JobContext` and run inside a worker where the SDK is
installed, so its type declarations import types from `@livekit/agents`.
`@livekit/agents`, the `@livekit/agents-plugin-*` packages and
`@livekit/rtc-node` are `optionalDependencies` of `@juspay/neurolink`: a default
`npm install` installs them, and `npm install --omit=optional` does not.

- **Installed without optional dependencies.** Type-checking a file that
  imports `@juspay/neurolink/livekit` fails with
  `TS2307: Cannot find module '@livekit/agents'`. Install `@livekit/agents` in
  the project that uses this entry, or do not import the entry. The other
  entries of the package do not need it.
- **`@types/node` range.** With `strict` on and `skipLibCheck` off, the LiveKit
  packages' own declarations compile cleanly on `@types/node` 22 and 24.19.2,
  the versions this was measured on. On `@types/node` 25 (25.9.9) and 26
  (26.6.5) two third-party declarations fail:
  `node_modules/@livekit/agents/dist/worker.d.ts` (TS2344) and
  `node_modules/@livekit/rtc-node/dist/audio_stream.d.ts` (TS2416). They are
  not NeuroLink's files and NeuroLink cannot fix them; set `skipLibCheck: true`,
  or stay on `@types/node` 22 or 24.19.2, in the project that imports this
  entry.

LiveKit runs each call as a Job in its **own child process** and re-imports the
agent entry file there. Because a live object cannot cross that process
boundary, the NeuroLink instance is built **inside each job process** via a
`createNeuroLink` factory — not passed in from a parent. This is split into two
files: the agent entry file (the default export) and a small launcher.

### 1. Define and launch the agent

#### 1a. Agent entry file (default export)

```ts
// voice-agent-entry.ts
import { defineVoiceAgent } from "@juspay/neurolink/livekit";
import { buildConfiguredNeuroLink } from "./neurolink-instance.js";

export default defineVoiceAgent({
  // Built once per call, inside the job process (registers its own tools).
  createNeuroLink: async () => buildConfiguredNeuroLink(),
  provider: process.env.VOICE_LLM_PROVIDER ?? "bedrock",
  model: process.env.VOICE_LLM_MODEL ?? "claude-sonnet-4-6",
  systemPrompt:
    "You are a concise, helpful voice assistant. Keep replies short and spoken.",
  stt: { provider: "deepgram" },
  tts: { provider: "elevenlabs" },
});
```

`defineVoiceAgent` overrides the agent's `llmNode` so every turn calls
`neurolink.stream()` with a per-room `conversationId` (NeuroLink owns history
and tools), and wires abort-on-interrupt: when LiveKit cancels a turn the
in-flight stream is aborted.

#### 1b. Launcher

```ts
// voice-agent-worker.ts — run as its own Node process
import { startVoiceAgentWorker } from "@juspay/neurolink/livekit";

await startVoiceAgentWorker({
  agentFile: new URL("./voice-agent-entry.js", import.meta.url).pathname,
  agentName: "neurolink-voice",
});
```

`startVoiceAgentWorker` resolves LiveKit connection settings from the
environment (`LIVEKIT_URL`/`LIVEKIT_API_KEY`/`LIVEKIT_API_SECRET`) and registers
the worker; LiveKit dispatches one Job per room.

### 2. Mint a join token (host application, plain HTTP)

```ts
import { mintJoinToken } from "@juspay/neurolink/livekit";

export async function GET({ locals }) {
  const room = `voice-${locals.merchantId}-${crypto.randomUUID()}`;
  const token = await mintJoinToken({
    identity: locals.userId,
    room,
    apiKey: process.env.LIVEKIT_API_KEY!,
    apiSecret: process.env.LIVEKIT_API_SECRET!,
  });
  return Response.json({ token, url: process.env.LIVEKIT_URL, room });
}
```

### 3. Join from the browser

```ts
import { Room } from "livekit-client";

const { token, url } = await (await fetch("/api/voice/token")).json();

// Enable the browser's built-in WebRTC audio cleanup as capture defaults. These
// are free, run client-side, and need no LiveKit Cloud: echo cancellation stops
// the agent's own voice being re-captured, noise suppression removes steady
// ambient noise, and auto gain normalizes mic level.
const room = new Room({
  audioCaptureDefaults: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
});

await room.connect(url, token); // room is auto-created on first join
await room.localParticipant.setMicrophoneEnabled(true);
// remote audio tracks (the agent's voice) play automatically
```

### Lower-level alternative

For full control, build the agent directly with `@livekit/agents` and supply a custom `llmNode` that calls `neurolink.stream()`. `startVoiceAgentWorker` is a convenience wrapper around that pattern.

---

## Source Layout

```text
src/lib/voice/livekit/
├── brain.ts             # provider-agnostic: (transcript, conversationId, signal) → NeuroLink stream
├── voiceAgent.ts        # @livekit/agents Agent + llmNode adapter + abort-on-interrupt
├── voiceAgentWorker.ts  # startVoiceAgentWorker(): WorkerOptions, agentName, plugin wiring
├── tokens.ts            # mintJoinToken() (livekit-server-sdk)
├── config.ts            # env resolution (LiveKit, STT/TTS, model/provider)
└── index.ts             # public exports → @juspay/neurolink/livekit
```

- `brain.ts` is transport-agnostic and reusable by future transports (for example, Daily.co).
- LiveKit packages are declared as optional/peer dependencies, mirroring how `@picovoice/cobra-node` is handled for the WebSocket voice agent.

---

## Configuration

### LiveKit (Cloud or self-hosted)

```env
LIVEKIT_URL=wss://<project>.livekit.cloud   # or wss://livekit.internal (self-hosted) or ws://localhost:7880 (dev)
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
```

### STT / TTS plugins

```env
DEEPGRAM_API_KEY=
ELEVENLABS_API_KEY=        # or CARTESIA_API_KEY
```

### LLM (NeuroLink brain)

```env
VOICE_LLM_PROVIDER=bedrock
VOICE_LLM_MODEL=claude-sonnet-4-6
# plus the provider's own credentials (e.g. AWS credentials for Bedrock)
```

### Turn detection & lifecycle (optional)

```env
LIVEKIT_EOU_TURN_DETECTION=true       # opt in to the semantic end-of-utterance model (English)
LIVEKIT_EOU_UNLIKELY_THRESHOLD=0.15   # optional; lower = more patient, higher = responds sooner
VOICE_INACTIVITY_TIMEOUT_MS=600000    # auto-shut down an idle call after this many ms (default 10 min; <=0 disables)
```

See [Semantic turn detection](#semantic-turn-detection-end-of-utterance) and
[Inactivity shutdown](#inactivity-shutdown) for details.

---

## Tuning the Voice Loop (VAD, Turn Detection, Interruption, Language)

All tuning is passed to `defineVoiceAgent`. Every field is optional and falls back
to a noise-resistant default — you only set what you want to change.

### Voice Activity Detection (VAD)

VAD decides when the user is speaking. Stricter values reject background noise so
the agent does not treat ambient sound as a turn.

```ts
export default defineVoiceAgent({
  createNeuroLink: async () => buildConfiguredNeuroLink(),
  stt: { provider: "deepgram" },
  tts: { provider: "elevenlabs" },
  vad: {
    activationThreshold: 0.6, // 0–1; "is this speech" cutoff. Higher = stricter.
    minSpeechDuration: 0.2, // seconds of speech before a turn STARTS.
    minSilenceDuration: 0.6, // seconds of silence before a turn ENDS.
  },
});
```

| Field                 | Default | Raise it when…                                       |
| --------------------- | ------- | ---------------------------------------------------- |
| `activationThreshold` | `0.6`   | A noisy room triggers false turns (try `0.7`–`0.8`). |
| `minSpeechDuration`   | `0.2`s  | Short clicks/taps start spurious turns.              |
| `minSilenceDuration`  | `0.6`s  | The agent cuts users off during natural pauses.      |

### Semantic turn detection (end-of-utterance)

**Why this exists.** VAD only hears _silence_ — it cannot tell the difference
between "I'm finished" and a mid-thought pause. With VAD alone, a user who says
"I'd like to book a flight to… London" gets cut off at the pause, the agent
answers half a sentence, and the rest arrives as a second fragmented turn. Raising
`minSilenceDuration` to compensate makes the agent feel sluggish on the turns that
_are_ finished. Semantic turn detection breaks that trade-off.

**What it does.** A small ML model (`@livekit/agents-plugin-livekit`
`turnDetector.EnglishModel`) runs on top of VAD and scores how likely the user has
actually finished speaking, using the words transcribed so far. If the user paused
mid-thought, the agent keeps listening; if the utterance is grammatically and
semantically complete, it responds immediately. The result is one clean turn per
thought instead of one turn per pause.

**How to enable it.** It is opt-in via environment variable:

```env
LIVEKIT_EOU_TURN_DETECTION=true          # enable the end-of-utterance model
LIVEKIT_EOU_UNLIKELY_THRESHOLD=0.15      # optional; override the "not done yet" cutoff
```

`LIVEKIT_EOU_TURN_DETECTION` accepts any truthy value (`true`, `1`, `yes`, `on`).
`LIVEKIT_EOU_UNLIKELY_THRESHOLD` tunes sensitivity: a probability below the cutoff
means "the user is probably _not_ done," so the agent waits longer. Lower it to make
the agent more patient (wait through more pauses); raise it to make the agent
respond sooner.

**Tuning the wait.** The `turn` config bounds how endpointing behaves once the model
has an opinion:

```ts
defineVoiceAgent({
  // …stt / tts / createNeuroLink…
  turn: {
    mode: "stt", // turn-detection mode
    minEndpointingDelay: 500, // ms grace period after the model thinks the turn is done
    maxEndpointingDelay: 6000, // hard ceiling — never wait longer than this
  },
});
```

- `minEndpointingDelay` is the grace period applied when the model decides the turn
  is complete — a small buffer so a quick continuation isn't clipped.
- `maxEndpointingDelay` is a safety ceiling. Even if the model keeps believing the
  user might continue, the agent **never waits forever** — it responds once this
  ceiling is hit.

**Cost & limits.** The English model adds roughly negligible latency, but non-negligible memory, so
size your worker hosts accordingly. The model is **English-only**; the multilingual
runner is intentionally not registered. For non-English calls, leave EOU disabled and
rely on VAD endpointing.

### Interruption (barge-in)

Controls what counts as the user interrupting the agent while it is speaking.
Requiring real words and a minimum duration stops background noise from cutting
the agent off mid-sentence.

```ts
defineVoiceAgent({
  // …stt / tts / createNeuroLink…
  interruption: {
    minWords: 2, // recognized words required to interrupt (default 2)
    minDuration: 600, // milliseconds of audio required to interrupt (default 600)
  },
});
```

Set `minWords: 0` for instant barge-in on any sound — more responsive, but more
false interruptions in noisy environments.

### Language & multilingual speech

The `language` field on `stt` is a **soft hint**: it biases recognition toward a
language without locking to it, so a user can switch languages mid-call and still
be transcribed correctly.

```ts
defineVoiceAgent({
  // …
  stt: {
    provider: "soniox",
    language: "en", // soft hint only — multilingual auto-detect still applies
  },
});
```

- Omit `language` for full auto-detection.
- The hint only biases the first guess; it never forces the hinted language. (A
  strict lock causes the realtime stream to stall on other-language audio, so the
  integration intentionally keeps the hint soft.)

### Speech provider selection

STT and TTS plugins are chosen per agent and configured by environment credentials.

```ts
defineVoiceAgent({
  // …
  stt: { provider: "soniox", model: "stt-rt-preview", language: "en" },
  tts: { provider: "cartesia", voice: "<voice-id>", model: "sonic-3.6" },
});
```

- **STT:** `soniox`, `deepgram`. **TTS:** `cartesia`, `elevenlabs`.
- Only set `voice` / `model` if your account supports them; otherwise omit those
  fields to use the plugin's own defaults.

---

## Conversation Memory

The agent remembers earlier turns automatically when the NeuroLink instance you
build inside `createNeuroLink` has conversation memory enabled. History is the
agent's source of truth — LiveKit's own transcript context is not used for
generation.

```ts
import { NeuroLink } from "@juspay/neurolink";
import { defineVoiceAgent } from "@juspay/neurolink/livekit";

export default defineVoiceAgent({
  createNeuroLink: async () =>
    new NeuroLink({ conversationMemory: { enabled: true } }),
  stt: { provider: "deepgram" },
  tts: { provider: "elevenlabs" },
});
```

How it behaves:

- **Keyed per call.** Each room/call is an isolated conversation; the id is
  derived from the room name. Override the prefix with `conversationIdPrefix`
  (default `"voice"`).
- **In-memory by default; Redis for persistence.** Set `REDIS_URL` to use a
  shared store that survives worker restarts and is shared across worker
  replicas — important because each call runs in its own job process.
- **Works across turns within the session.** The user can say "my name is Alex"
  and later ask "what's my name?" and the agent recalls it.

> Memory persists only when the instance is configured with
> `conversationMemory.enabled`. Without it, each turn is independent.

### Remembering a realtime call in the user's own conversation

A speech-to-speech call (`defineRealtimeVoiceAgent`) never goes through
`stream()` or `generate()`, so by default nothing it says is stored. Opt in with
`memory` and the call's turns are written, through
`NeuroLink.recordConversationTurn`, to the same conversation memory typed chat
uses, appended to the conversation the person already has open. The model is
also seeded with that conversation's recent history when the call starts, so it
knows what was said before.

```ts
export default defineRealtimeVoiceAgent({
  memory: {
    // Same store, key prefix and lifetime as the web app's NeuroLink instance.
    createNeuroLink: async () =>
      new NeuroLink({ conversationMemory: { enabled: true } }),
  },
});
```

**Whose conversation is never taken from the client.** The host that creates
the room signs a binding and puts it in the room metadata next to `authToken`
and `mcpContext`. The worker stores nothing unless it verifies.

```ts
import { signVoiceMemoryBinding } from "@juspay/neurolink/livekit";

const memory = signVoiceMemoryBinding({
  room, // the LiveKit room name you create
  userId, // the verified session's user id, composed as chat composes it
  sessionId, // "voice-<uuid>", or an existing conversation id (see below)
  secret: process.env.NEUROLINK_VOICE_MEMORY_SECRET!,
});
const metadata = Buffer.from(
  JSON.stringify({ authToken, mcpContext, memory }),
).toString("base64");
```

- The signature is `HMAC-SHA256` over `["neurolink.voice.memory.v1", room,
userId, sessionId, exp]` (a JSON array, so no choice of values can make two
  bindings collide), `base64url`-encoded. It covers the room name, so a binding
  copied into another room does not verify. `exp` is Unix seconds; the default
  lifetime is two hours, the cap 24 hours.
- The shared secret is at least 16 characters, read from
  `NEUROLINK_VOICE_MEMORY_SECRET` unless `memory.secret` is set on the worker.
- `sessionId` matches `^[A-Za-z0-9_-]{1,128}$` (no `:`, which is part of the
  stored key). `userId` is 1 to 256 characters with no whitespace or control
  characters; `:` is allowed because chat user ids contain it.
- **Fail closed.** No secret, no binding, a malformed or expired binding, or a
  bad signature: the call runs normally, nothing is stored, and a warning
  names the reason (never the ids).
- A client may name the conversation to append to. The host accepts the name
  only when `neurolink.conversationExists({ sessionId, userId })` is true for
  the verified user. Otherwise it mints a new `voice-<uuid>`.

**What is stored.** Each finished exchange becomes a user message and an
assistant message with the ids `${turnId}:user` and `${turnId}:assistant`, where
`turnId` is the realtime session's assistant message id, and
`metadata.modality: "voice"`. Recording the same `turnId` again is a no-op. Tool
calls are stored as `tool:start` / `tool:end` events on the assistant message,
with arguments and results bounded to 4000 characters. A reply cut off by the
person speaking over it is stored as far as it got with `metadata.interrupted`.
A call that ends mid-turn stores what was said plus a short note, with
`metadata.interrupted` and `metadata.callEnded`; a user turn the call ended
before answering gets the note alone as the reply. Typed chat turns are stored
exactly as before. A message with no `modality` is a typed message.

**Out-of-order transcripts.** The user's final transcript can arrive after the
assistant has started or finished replying. A complete reply with no user text
waits 1.5 seconds (`memory.settleMs`) for one; a reply that never gets one (the
opening greeting) is not stored, because a stored turn needs both sides.

**Not saved.** Writes are retried and run one at a time, in order. If a turn
still cannot be stored, the call carries on, the data-channel event
`{ type: "memory", data: { state: "not-saved", turnId } }` is published so a
client can show a quiet note on that turn, and the turn is not retried again.
The `done` event carries `turnId` while memory is on, so a client can merge its
live copy of a turn with history instead of showing it twice.

**Shutdown.** The flush is registered before the worker's process reaper and
waits for pending writes for at most 800 ms (`memory.flushBudgetMs`); the
reaper exits the process about a second after shutdown begins.

**Cascaded agents** (`defineVoiceAgent`) already store through `stream()`.
Setting `memory: {}` makes them read the same binding: a verified one replaces
the static `userId` and the room-derived conversation id for that call, and
the opening greeting is run without touching memory so it is not filed as
something the person said. Every turn the brain streams is stamped
`modality: "voice"`.

Not covered here: titles and summaries are produced by background tasks that the
worker exit can cut off, so a conversation created by a call may keep the title
"New Conversation"; and a typed turn and a voice turn written to the same
conversation at the same moment are not serialised against each other.

---

## Realtime Speech-to-Speech Backends (Gemini Live and xAI Grok Voice)

`defineRealtimeVoiceAgent` runs one realtime model that does speech-to-text,
reasoning, text-to-speech and turn detection over a single connection. Gemini
Live on Vertex is the default. xAI's Grok Voice is a second backend, reached
through LiveKit's xAI plugin.

### Status

Run against the live xAI service on 2026-10-20 with synthetic speech (a
text-to-speech voice, not a person), inside a recorded budget: 21 WebSocket
sessions, about 95 seconds connected, under US$0.20. Plugin version 1.4.6. What
that showed:

- **It works through the plugin.** A greeting, a text turn, a spoken turn
  answered in voice, a function call with its continuation, a seeded history and
  two voices all completed with no error event.
- **`grok-voice-3.0` is accepted and honoured:** `session.created` names it.
- **First audio** arrived 985 ms after a text turn (counted from
  `response.create`) and 1,229 ms after a spoken turn (counted from
  `input_audio_buffer.speech_stopped`). One sample each, from one network
  location, so neither is a distribution.
- **Price:** xAI's own pages list USD 0.08 per minute. That is a list price; no
  invoice was checked.
- **Function calling works** for one function tool with a flat object schema.
  Tool names with underscores and the `$schema` and `additionalProperties`
  fields the sanitizer leaves in were accepted.
- **The plugin's `session.update` layout is accepted** and its voice and
  turn-detection settings take effect. The service's echo of the turn detection
  leaves out `threshold` and `interrupt_response`; whether it ignores them was
  not measured.
- **Seeded history is accepted:** a user and an assistant message sent before the
  first turn were used by the model.

The same run found the differences from OpenAI that the sections below handle:
repeated final transcripts, usage reported in another place, an unknown model or
voice accepted without an error, and a wrong key that crashes the plugin's
socket. It did **not** cover a full agent in a LiveKit room, interruption, or
calls longer than a few seconds; see [Still unmeasured](#still-unmeasured).

### Choosing the backend

```env
VOICE_REALTIME_BACKEND=xai      # "gemini" (default) or "xai"; case-insensitive; blank means gemini
XAI_API_KEY=                    # xai only; read by the LiveKit xAI plugin, shared with the xAI chat provider
VOICE_LIVE_MODEL=               # optional; see the defaults below
VOICE_S2S_VOICE=                # optional; blank leaves the plugin's own voice
XAI_REALTIME_BASE_URL=          # optional ws:// or wss:// URL; blank keeps the plugin's own endpoint
XAI_REALTIME_ALLOW_INSECURE=    # optional; "true" allows a ws:// base URL to a host other than loopback
```

| Variable                                                                          | Backend | Meaning                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --------------------------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VOICE_REALTIME_BACKEND`                                                          | both    | `gemini` or `xai`. Any other value throws at startup, naming the variable and the two choices and repeating nothing from the environment.                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `VOICE_LIVE_MODEL`                                                                | both    | Realtime model id. Default `gemini-live-2.5-flash` for gemini, `grok-voice-3.0` for xai. xAI does not reject an id it does not know: it runs a default model and says nothing, so a typo changes nothing. The xai backend logs a `realtime.xai.modelMismatch` warning when `session.created` names another model than the one asked for.                                                                                                                                                                                                                                               |
| `VOICE_S2S_VOICE`                                                                 | both    | Voice name. Voices differ between the two models: set it for the backend you chose, or leave it blank (the xAI plugin then uses `ara`). xAI does not reject a voice it does not know either, and nothing is logged for one; `GET https://api.x.ai/v1/tts/voices` (with the key as a Bearer token) lists the valid ids.                                                                                                                                                                                                                                                                 |
| `XAI_API_KEY`                                                                     | xai     | Required. Read by the plugin from the environment and shared with the xAI chat provider, which reads the same variable. Never part of the config object and never logged.                                                                                                                                                                                                                                                                                                                                                                                                              |
| `XAI_REALTIME_BASE_URL`                                                           | xai     | `ws://` or `wss://` URL of the realtime endpoint, for a gateway or a test server. Unset keeps the plugin's own default, `wss://api.x.ai/v1`. A `ws://` URL is accepted only for `localhost`, an address in `127.0.0.0/8` or `[::1]`; to any other host it throws unless `XAI_REALTIME_ALLOW_INSECURE=true` is set. Anything else that is not a `ws://` or `wss://` URL throws too. Both errors are raised at startup and do not repeat the value. The URL is checked whatever the backend, so a bad value stops a gemini deployment too. A caller's `xaiBaseURL` gets the same checks. |
| `XAI_REALTIME_ALLOW_INSECURE`                                                     | xai     | Set to `true` to allow a `ws://` base URL (from `XAI_REALTIME_BASE_URL` or `xaiBaseURL`) to a host other than loopback. **With it set, `XAI_API_KEY` travels in cleartext to that host**, readable by anything on the path. Leave it unset unless the network between the worker and that host is one you control. Only `true` (any case) counts; any other value, or none, leaves the refusal in place.                                                                                                                                                                               |
| `VERTEX_PROJECT`, `VERTEX_LOCATION`, `VOICE_RESPONSE_MODALITY`, Google ADC fields | gemini  | Gemini only. They are ignored for xai, and the xai logs do not print them.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

`VOICE_LIVE_MODEL` is shared by both backends. If you switch the backend, change
or unset it too, or the new backend is sent the other one's model id.

The same choice can be made in code, which beats the environment (a value that is not `gemini` or `xai` throws, repeating nothing):

```ts
export default defineRealtimeVoiceAgent({ backend: "xai", voice: "ara" });
```

`createRealtimeLlm(config)` (exported from `@juspay/neurolink/livekit`) is the
factory the agent uses. It returns the LiveKit realtime model for
`config.backend` and imports the plugin dynamically, so the core package needs
neither plugin unless the realtime agent runs. It takes a complete
`RealtimeVoiceConfig` (build one with `resolveRealtimeVoiceConfig()`), throws
when the xai backend is chosen and `XAI_API_KEY` is unset, throws when the xai
backend is given an `xaiBaseURL` that is not a `ws://` or `wss://` URL or is a
`ws://` URL to a host other than loopback without `XAI_REALTIME_ALLOW_INSECURE=true`
(a hand-built config gets the same two refusals as config resolution, and the
opt-in never admits a value that is not a ws or wss URL), and does **not** run
the Vertex helpers (`ensureVertexAdc`, `clearGeminiApiKeyEnv`) for gemini: only
the agent entry does, so a caller using the factory directly has to set up
Google credentials itself.

### Dependencies

The xai backend needs `@livekit/agents-plugin-xai` and
`@livekit/agents-plugin-openai`. Both are optional dependencies of this package,
so they are installed with its other optional dependencies (an install that
omits optional dependencies has to add them by hand), and both resolved to
1.4.6 in its lockfile. The xAI plugin asks for `@livekit/agents` 1.4.6 exactly,
which is why that package moved from 1.4.5 to 1.4.6 with it. The options the
Gemini backend builds are unchanged by the move, but no live Gemini call was
run after it.

### What the xai backend does

The LiveKit xAI plugin extends the OpenAI realtime model. It connects to
`<base URL>/realtime?model=<id>` with `Authorization: Bearer <XAI_API_KEY>` (the
key is never put in the URL) and its first event is a `session.update` that
carries the model, the voice, `output_modalities: ["audio"]`, server-side
voice-activity detection (threshold 0.5, 300 ms prefix padding, 200 ms silence,
response creation and interruption on). The plugin's default endpoint is
`wss://api.x.ai/v1`. xAI documents a flatter layout than the plugin sends and
accepts the plugin's anyway.

Four places where the live service differs from what the plugin assumes, and
what this package does about each:

- **Input transcription is left out of the layout.** The plugin's default is
  `{ model: "gpt-4o-mini-transcribe" }`, an OpenAI model name. xAI accepts it,
  and then answers one spoken utterance with five `completed` transcripts of
  growing text (20, 36, 58, 58 and 58 characters for one 58-character sentence)
  plus three `updated` ones. Any `transcription` key does this, including xAI's
  own `grok-transcribe`. The plugin turns each `completed` event into a final
  user transcript, so the turn recorder stored 234 characters: the sentence
  repeated. The factory therefore builds the model with
  `inputAudioTranscription: undefined`, the one place it erases a plugin
  default on purpose; the plugin then sends no `transcription` key and xAI sends
  one `completed` transcript per utterance. Transcription itself stays on.
- **Usage is in another place.** xAI sends the token counts at the top level of
  `response.done` and leaves `response.usage`, where the plugin reads, an empty
  object, so the plugin's own metrics are zero for every response. The xai
  model reads the top-level counts (and `response.usage` when the top level has
  none) and logs `realtime.usage` with the same six fields the Gemini backend
  logs. A response that reports nothing, such as a cancelled one, logs nothing.
  `billable_audio_seconds`, which xAI also reports, is not logged; see the price
  note below.
- **An unknown model id or voice is accepted without an error.** A made-up model
  id connects and runs as `grok-voice-3.0`. So do the plugin's own default,
  `grok-voice-think-fast-1.0`, and the alias `grok-voice-latest`;
  `grok-voice-2.0` came back as itself. The xai model compares the model named
  in `session.created` with the one it asked for and logs a
  `realtime.xai.modelMismatch` warning when they differ. It does not fail the
  call, and an alias triggers it too. A made-up voice produced no error and a
  coarse pitch estimate matching the default voice `ara`; nothing is logged for
  one, so check ids against `GET https://api.x.ai/v1/tts/voices` (28 voices when
  measured).
- **A wrong key is refused with HTTP 400, not 401,** at the WebSocket upgrade,
  and the plugin opens its socket with no `error` listener, so the refusal is an
  uncaught exception. See [Troubleshooting](#troubleshooting).

NeuroLink defaults to `grok-voice-3.0`, the flagship id xAI's documentation
lists (together with the alias `grok-voice-latest` and a deprecated
`grok-voice-2.0`); the measurement above is why it stays the default.

**A missing key stops the call before it connects.** If `XAI_API_KEY` is unset
the plugin falls back to `OPENAI_API_KEY`, and a stub server showed that
fallback sending the OpenAI key as the Bearer token to the configured xAI URL.
(An empty value does not fall back: the plugin throws its own `OpenAI API key is
required` error. A whitespace-only value is sent as the key.) NeuroLink
therefore refuses an unset, empty or whitespace-only key: it throws
`XAI_API_KEY is not set ...` when the agent starts and again in
`createRealtimeLlm`, and no connection is made.

### How each part of the agent behaves on xai

| Part                                                               | On xai                                                                                                                                                                                                                                                                                           |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Vertex ADC and `GEMINI_API_KEY` clearing                           | Not run. The xai backend never touches the Gemini environment.                                                                                                                                                                                                                                   |
| Data-channel event bridge, HITL, room context                      | Unchanged. They work on the LiveKit room and the agent session, not on a model.                                                                                                                                                                                                                  |
| Session events (user transcript, assistant text, turn done, usage) | Unchanged code, with one difference. The user transcript, assistant text and turn events reach the shapes the agent reads. Usage does not come through the plugin's metrics (they are zero on xai); the xai model logs `realtime.usage` itself and the agent skips the plugin's metrics for xai. |
| MCP tool bridge and schema sanitizer                               | Unchanged. The sanitizer produces plain JSON Schema (the OpenAI-style API takes full JSON Schema), and the plugin forwards it as is. Keeping it is the safer choice: it drops `$ref` and unions that xAI has not been tried with.                                                                |
| Conversation memory (recording and seeding)                        | Recording is shared by both backends. Each remembered turn is traced with the model id and the backend's provider: `vertex` for gemini, `xai` for xai. xAI accepted seeded history items in the live run (the model was driven directly, not in a room).                                         |
| `realtime.config` and `realtime.room.joined` logs                  | Name the backend. The Vertex project, location and modality are printed for gemini only; for xai the base URL is reduced to a yes/no.                                                                                                                                                            |

xAI's list price for Grok Voice is USD 0.08 per minute (source:
https://x.ai/news/grok-voice-3, and xAI's voice documentation, read 2026-10-20).
That is xAI's figure, not something NeuroLink measured against an invoice. xAI
reports `usage.billable_audio_seconds` on each `response.done`. In each of the
four recorded sessions with more than one response it rose from one response to
the next (for example 1, 3, 9, 11, 12), so it is a running total for the
session and not a per-response figure: adding the values up over-counts. How it
is computed was not established.

### Still unmeasured

A full agent inside a LiveKit room: a `voice.AgentSession` with the event
bridge, human confirmations and MCP tools going through the model (the model was
driven directly, without a room). Interruption and truncation
(`conversation.item.truncate`, `response.cancel`). Reconnection, the plugin's
20-minute session cap, idle timeouts and calls longer than a few seconds.
Parallel and server-side tools, and tool schemas with `$ref` or unions (the
sanitizer removes those). Latency beyond the two single samples above. Accuracy
with human speech and accents. The real charge in xAI's console. The results
above are for plugin 1.4.6, which predates later xAI-specific handling in newer
plugin releases.

### Troubleshooting

- `VOICE_REALTIME_BACKEND must be "gemini" or "xai"`: fix the value, or unset it
  for gemini.
- `XAI_API_KEY is not set`: set it in the worker's environment. The check also
  rejects a whitespace-only value.
- `XAI_REALTIME_BASE_URL must be a ws:// or wss:// URL` (or the same for
  `xaiBaseURL`): use a WebSocket URL, not an `https://` one.
- `XAI_REALTIME_BASE_URL is a ws:// URL to a host other than localhost, ...` (or
  the same for `xaiBaseURL`): the URL would send `XAI_API_KEY` unencrypted to a
  host that is not loopback. Use a `wss://` URL. Only if the path to that host is
  one you trust, set `XAI_REALTIME_ALLOW_INSECURE=true`, knowing the key then
  travels in cleartext.
- A call that will not start on the xai backend: confirm that `VOICE_LIVE_MODEL`
  and `VOICE_S2S_VOICE` hold xAI values and not leftover Gemini ones, since both
  variables are shared.
- `xAI refused the realtime connection with HTTP 400` (in the log as
  `realtime.xai.connectRefused`), or `Unexpected server response: 400` in a
  stack trace: a wrong, revoked or expired `XAI_API_KEY`. xAI answers a wrong
  key with HTTP 400 at the WebSocket upgrade, not 401. The plugin opens its
  socket with no `error` listener, so the refusal is an uncaught exception, and
  a Node process with no handler for it exits with code 1. This package cannot
  stop that. What it does before the exception takes effect is log the
  classified error and emit it as an unrecoverable `error` on the model session;
  the LiveKit agent session forwards that to the handler the agent entry already
  has, which logs `realtime.session.error` and publishes `status: error` (read
  from the LiveKit source; not run inside a room). With
  `installVoiceWorkerProcessGuards()` installed in the process, the exception is
  logged and a job child exits one second later instead. Only the connection
  attempt is covered, and every session still connecting in the process is told,
  because the crash carries no socket and ends the process for all of them: a crash after the connection is made is left to the
  process, and the real fix is an `error` listener in the plugin's socket code.
- A `realtime.xai.modelMismatch` warning: `VOICE_LIVE_MODEL` names an id xAI does
  not run (a typo, or a retired id), or an alias such as `grok-voice-latest`.
  The call goes on with the model named in `served`.

---

## Implementation Plan

The integration is built and validated in phases. Each phase is independently testable.

### Phase 0 — Console-mode spike (no infrastructure)

Build a minimal agent (Silero VAD + Deepgram STT + ElevenLabs TTS + `llmNode` → `neurolink.stream()`) and run it in **console mode** using the host machine's mic/speakers. Validates the NeuroLink brain loop, `conversationId` history, and a tool call — with no LiveKit server and no browser. Requires only STT/TTS and LLM credentials.

### Phase 1 — NeuroLink LiveKit module

Implement `brain.ts`, `voiceAgent.ts`, `voiceAgentWorker.ts`, `tokens.ts`, `config.ts`; add the `@juspay/neurolink/livekit` export and optional/peer dependencies. The worker factory **accepts an external NeuroLink instance** so a host application's registered tools are available. Wire abort-on-interrupt. Verify build, type-check, and lint.

### Phase 2 — Host token endpoint + browser client

Add the HTTP token endpoint and a browser page using `livekit-client`. Verify token issuance and room connection.

### Phase 3 — End-to-end (local or Cloud)

Run the worker against `livekit-server --dev` or a Cloud Build-tier project; complete a full loop in the browser including barge-in, a tool call, and multi-turn memory.

### Phase 4 — Tool-call UX

Add abort-on-interrupt verification (barge-in cancels an in-flight tool), tool-latency feedback (acknowledgment phrase and/or data-channel status event), and turn-detection tuning.

### Phase 5 — Production

Deploy the worker as its own scalable Node deployment (separate from the web tier). Choose Cloud or self-hosted LiveKit. Validate concurrency and worker-restart isolation.

---

## Operational Behavior

### Scaling

LiveKit Agents uses a Worker→Job model: a worker registers with the LiveKit server and is dispatched one **Job per room**, each Job running in its **own process**. Scale by adding worker replicas; a worker failure restarts affected Jobs on another worker without impacting others.

### Inactivity shutdown

**Why this matters.** Every call runs in its **own process**, which holds real
resources for the whole call: the STT/TTS connections, conversation memory, and —
when semantic turn detection is on — the ~200 MB end-of-utterance model. If a caller
walks away without hanging up, that process would otherwise linger indefinitely,
holding RAM and (on LiveKit Cloud) continuing to bill per participant-minute. An
inactivity watchdog reclaims those resources automatically.

**What it does.** A timer tracks how long the call has been idle. Any real activity
resets it — the user speaking, the agent speaking, or a new conversation item being
added. If no activity occurs within the threshold, the watchdog calls the job's
**graceful shutdown**, which tears down the process cleanly (the same path used when
a call ends normally).

**How to configure it.**

```env
VOICE_INACTIVITY_TIMEOUT_MS=600000   # default 10 minutes; set <=0 to disable entirely
```

- Default is **10 minutes**. Lower it to reclaim resources faster on short-lived
  calls; raise it for workflows with long expected silences.
- Set to `0` (or any non-positive value) to **disable** the watchdog — calls then end
  only on explicit hang-up or transport disconnect.

### Cloud vs Self-Hosted Cost

- **Cloud:** per participant-minute (a call has two participants — the user and the agent). A free Build tier covers development.
- **Self-hosted:** no per-minute media fee; cost is the compute and bandwidth of running `livekit-server` and workers on your infrastructure.

### Why the brain layer is transport-agnostic

`brain.ts` exposes a small surface — given a transcript, a `conversationId`, and an abort signal, it returns a NeuroLink stream. This keeps the NeuroLink integration reusable if an alternative transport is added later.

---

## Error Handling & Troubleshooting

### Worker not receiving Jobs

- Confirm the worker registered with the correct `LIVEKIT_URL` and `agentName`.
- For Cloud, confirm the worker process is running and its outbound connection is established (no inbound exposure is required).

### No assistant audio

- Verify STT/TTS plugin credentials.
- Check that the TTS plugin is producing frames for the room.

### Assistant talks over the user / does not stop on interruption

- Verify abort-on-interrupt is wired: LiveKit's cancellation must abort the in-flight `neurolink.stream()` (and any active tool).

### Long silence during tool calls

- Expected while a tool runs inside `stream()`. Add an acknowledgment phrase and/or a data-channel status event.

### Tools not available in voice

- Ensure the `createNeuroLink` factory returns an instance with tools registered, and that tools are not disabled.

---

## Extensibility Roadmap

1. **Additional transport providers** — back the same `brain.ts` with another WebRTC provider (for example, Daily.co). Note that some providers' server-side agent paths are not Node-native.
2. **Human-in-the-loop (HITL)** — voice-native confirmation, or route NeuroLink HITL approvals over a LiveKit data channel with matching abort handling.
3. **Tool-call UI events** — emit structured tool start/result events to the client for live status display.
4. **Voice personalization** — selectable voices, language presets, speaking-style controls.
5. **Pluggable STT/TTS through NeuroLink** — use NeuroLink's own STT/TTS providers via custom nodes instead of LiveKit plugins.
