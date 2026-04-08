# Real-Time Voice Agent - Streaming Voice Loop Design

**Automatic low-latency voice conversations with STT, LLM, TTS, and barge-in support**

---

## Table of Contents

1. [Problem Statement & Solution](#problem-statement--solution)
2. [Architecture Overview](#architecture-overview)
3. [Core Components](#core-components)
4. [Runtime Flow](#runtime-flow)
5. [CLI Integration](#cli-integration)
6. [Source Layout](#source-layout)
7. [Configuration](#configuration)
8. [Operational Behavior](#operational-behavior)
9. [Error Handling & Troubleshooting](#error-handling--troubleshooting)
10. [Performance Characteristics](#performance-characteristics)
11. [Extensibility Roadmap](#extensibility-roadmap)

---

## Problem Statement & Solution

### The Challenge

Real-time voice assistants are harder than ordinary request/response chat because they must coordinate:

- continuous microphone audio input
- speech detection
- real-time transcription
- streaming LLM generation
- streaming TTS playback
- interruption while the assistant is still speaking

Without careful coordination, common failures appear quickly:

- user speech gets cut off too early
- assistant speech is echoed back into the mic
- interruptions trigger too often or too late
- TTS providers fail under token-by-token flooding
- local MCP/tool initialization adds large latency spikes

### Our Solution

NeuroLink exposes a dedicated `voice-server` mode that runs a full browser-to-server voice loop:

1. Browser captures microphone audio
2. Cobra detects speaking/silence boundaries
3. Soniox performs streaming STT
4. NeuroLink streams the LLM response
5. Cartesia converts the response into streaming PCM audio
6. Browser plays audio immediately and supports mid-response interruption

### Key Benefits

- **Low-latency speech loop** for natural conversations
- **Automatic barge-in** while assistant audio is playing
- **Buffered TTS chunking** to avoid provider overload on long replies
- **Warmup path** to reduce first-turn cold start cost
- **Environment-driven configuration** for Cartesia endpoint/version overrides
- **Voice-mode tool isolation** by disabling MCP tools during real-time turns

---

## Architecture Overview

### System Flow Diagram

```text
┌─────────────────────────────────────────────────────────────┐
│ Browser                                                     │
│ • Captures 16kHz PCM mic audio                              │
│ • Sends audio over WebSocket                                │
│ • Plays assistant PCM audio                                 │
└────────────────────────┬────────────────────────────────────┘
                                         │
                                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Voice WebSocket Handler                                     │
│ • Maintains per-session state                               │
│ • Routes audio frames to VAD + STT                          │
│ • Sends assistant audio back to browser                     │
└────────────────────────┬────────────────────────────────────┘
                                         │
                 ┌─────────────┼─────────────┐
                 ▼             ▼             ▼
     Cobra VAD        Soniox STT     TurnManager
     • speech start   • partials     • IDLE
     • speech stop    • finals       • USER_SPEAKING
                                                            • PROCESSING
                                                            • ASSISTANT_SPEAKING
                 └─────────────┬─────────────┘
                                         ▼
┌─────────────────────────────────────────────────────────────┐
│ NeuroLink LLM Streaming                                     │
│ • Default: Azure gpt-4o-automatic (configurable via env)    │
│ • tools disabled for lower latency                          │
│ • short spoken response style                               │
└────────────────────────┬────────────────────────────────────┘
                                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Cartesia TTS                                                │
│ • transcript chunks in                                      │
│ • PCM S16LE 24kHz out                                       │
└────────────────────────┬────────────────────────────────────┘
                                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Browser Playback                                            │
│ • buffered playback                                          │
│ • sends playback_done when queue drains                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Voice Activity Detection

**Provider:** Picovoice Cobra

Purpose:

- identify when the user starts speaking
- identify when the user stops speaking
- move session state between `IDLE`, `USER_SPEAKING`, and `PROCESSING`

Implementation details:

- 512-sample frames
- threshold-based speech probability
- explicit start and stop hysteresis using consecutive frames

### 2. Streaming Speech-to-Text

**Provider:** Soniox

Purpose:

- transcribe incoming speech continuously
- use non-final tokens for reliable barge-in detection
- use final tokens plus `<end>` to trigger LLM processing

### 3. Turn State Management

**Component:** `TurnManager`

State machine:

```text
IDLE -> USER_SPEAKING -> PROCESSING -> ASSISTANT_SPEAKING
```

Purpose:

- prevent overlapping turns
- distinguish user speech from assistant playback state
- ensure barge-in only fires when the assistant is actually speaking

### 4. Streaming TTS Adapter

**Provider:** Cartesia

Purpose:

- accept streaming transcript chunks
- return PCM S16LE 24kHz audio for immediate playback

Important implementation detail:

- transcript is buffered into phrase/sentence chunks before being sent
- this avoids sending one tiny WS message per token
- reduces `Service unavailable` failures for long responses

### 5. Browser Client

Files in `src/lib/server/voice/public`:

- `src/lib/server/voice/public/index.html`
- `src/lib/server/voice/public/app.js`
- `src/lib/server/voice/public/pcm-worklet.js`
- `src/lib/server/voice/public/styles.css`

Responsibilities:

- microphone capture
- audio frame encoding and streaming
- assistant playback queueing
- playback completion signaling
- simple voice UI state updates

---

## Runtime Flow

### Normal Turn

1. Browser sends microphone PCM frames to server
2. Cobra detects speech start and publishes `vad_start`
3. Soniox streams transcription in parallel
4. On final transcript + `<end>`, server calls NeuroLink streaming
5. LLM response is buffered into TTS-friendly chunks
6. Cartesia returns audio chunks
7. Browser plays audio immediately
8. Browser sends `playback_done` after the queue drains
9. Session returns to `IDLE`

### Barge-In Flow

1. Assistant is already speaking
2. Soniox emits new non-final user speech tokens
3. Server verifies current state is `ASSISTANT_SPEAKING`
4. Server interrupts active TTS
5. Browser receives `{ type: "interrupt" }`
6. Current turn is canceled and user takes over

### Warmup Flow

On server startup:

1. NeuroLink performs a tiny LLM stream request using the configured voice provider
2. Cartesia WebSocket connection is opened and closed once
3. Subsequent first-user-turn latency is reduced

---

## CLI Integration

### Command

```bash
neurolink voice-server --port 3000
```

### Implementation Entry Point

- `src/cli/commands/voiceServer.ts`

### What the command does

- starts an Express server
- serves the browser UI
- exposes a `/health` endpoint
- attaches a WebSocket voice session handler
- performs LLM + TTS warmup in the background

---

## Source Layout

### CLI

- `src/cli/commands/voiceServer.ts`

### Voice Server Module

```text
src/lib/server/voice/
├── voiceServerApp.ts
├── voiceWebSocketHandler.ts
├── frameBus.ts
├── turnManager.ts
├── types.ts
└── public/
      ├── index.html
      ├── app.js
      ├── pcm-worklet.js
      └── styles.css
```

### TTS Adapter

- `src/lib/adapters/tts/cartesiaHandler.ts`

---

## Configuration

### Required Environment Variables

```env
# Cartesia
CARTESIA_API_KEY=

# Soniox
SONIOX_API_KEY=

# Picovoice Cobra
PICOVOICE_ACCESS_KEY=

# Azure OpenAI (for LLM — default provider)
AZURE_OPENAI_API_KEY=
AZURE_OPENAI_ENDPOINT=
```

### Optional Voice LLM Overrides

```env
# Override the LLM provider/model used for voice turns (defaults: azure / gpt-4o-automatic)
VOICE_LLM_PROVIDER=azure
VOICE_LLM_MODEL=gpt-4o-automatic
```

### Optional Cartesia Overrides

```env
CARTESIA_WS_BASE_URL=wss://api.cartesia.ai/tts/websocket
CARTESIA_API_VERSION=2025-04-16
```

### Optional Soniox Overrides

```env
SONIOX_WS_URL=wss://stt-rt.soniox.com/transcribe-websocket
```

These exist because the endpoint base URL is usually shared, but API key and version may vary by environment or future provider rollout.

---

## Operational Behavior

### Tuned Constants

| Constant                         |         Value | Purpose                               |
| -------------------------------- | ------------: | ------------------------------------- |
| `VOICE_THRESHOLD`                |         `0.7` | Cobra speech probability cutoff       |
| `VOICE_FRAMES_TO_START`          |  `5` (~160ms) | Filter short noise bursts             |
| `SILENCE_FRAMES_TO_STOP`         | `30` (~960ms) | Avoid cutting natural pauses          |
| Pre-lock before assistant speech |      `1000ms` | Protect initial TTS connection window |
| Lock refresh on first audio      |      `+400ms` | Cover browser AEC lock-on window      |

### Why MCP Tools Are Disabled

Voice mode sets:

```ts
process.env.NEUROLINK_DISABLE_MCP_TOOLS = "true";
```

Reason:

- tool/MCP initialization adds several seconds of latency
- real-time voice turns need predictable low overhead
- voice mode is optimized for direct conversation, not tool orchestration

### Why TTS Buffering Matters

Sending every token directly to Cartesia can overload the provider on long responses.

Current strategy:

- accumulate text in a local buffer
- flush at sentence/phrase boundaries or after a minimum chunk length
- keep speech natural while reducing provider stress

---

## Error Handling & Troubleshooting

### Common Runtime Failure Modes

#### 1. Invalid MCP HTTP Auth

Symptom:

```text
Authorization header is badly formatted
```

Impact:

- degraded latency
- failed or partial turns
- noisy logs during voice testing

Fix:

1. correct the local token/env value, or
2. disable that MCP server locally while testing voice mode

Important:

- this is a **local environment issue**
- do not commit personal `.mcp-config.json` changes unless they are intended for everyone

#### 2. Cartesia Temporary Unavailability

Symptom:

```text
Service unavailable: TTS generation services are temporarily unavailable
```

Impact:

- no assistant audio for that turn
- turn resets so the user can retry

Mitigation already implemented:

- mid-stream TTS errors abort the turn cleanly
- failed turns are not committed to conversation history
- long-response flooding was reduced via chunked TTS buffering

#### 3. Missing Environment Variables

Examples:

- `CARTESIA_API_KEY is not set in environment`
- `PICOVOICE_ACCESS_KEY is not set in environment`

Fix:

- populate values from `.env.example`

### Health Check

```text
GET http://localhost:3000/health
```

Returns:

```json
{ "status": "ok" }
```

---

## Performance Characteristics

### Expected Latency

| Condition       | STT -> First Audio |
| --------------- | -----------------: |
| Warm turn       |        ~700–1400ms |
| Cold first turn |            ~7000ms |

### Why cold start is slower

- initial LLM provider request setup (Azure by default)
- initial Cartesia TLS/WebSocket setup
- one-time runtime warmup overhead

Warmup in `src/lib/server/voice/voiceServerApp.ts` helps reduce this for the first real user turn.

---

## Extensibility Roadmap

Possible next steps:

1. **Provider abstraction for STT/TTS**
   - support alternative STT providers
   - support alternative TTS providers

2. **Richer browser client**
   - waveform UI
   - transcripts in real time
   - reconnect UX

3. **Session persistence**
   - resumable voice sessions
   - persisted conversation history

4. **Voice personalization**
   - user-selectable voices
   - language presets
   - speaking style controls

5. **Operational hardening**
   - retries/backoff for TTS transport
   - structured metrics for per-turn latency
   - better provider fallback strategies
