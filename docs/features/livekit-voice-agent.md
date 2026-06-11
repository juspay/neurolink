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
12. [Implementation Plan](#implementation-plan)
13. [Operational Behavior](#operational-behavior)
14. [Error Handling & Troubleshooting](#error-handling--troubleshooting)
15. [Extensibility Roadmap](#extensibility-roadmap)

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

> The integration is exposed under `@juspay/neurolink/livekit`. LiveKit dependencies are optional/peer dependencies and are only required when the voice agent is used.

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
  tts: { provider: "cartesia", voice: "<voice-id>", model: "sonic-2" },
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
