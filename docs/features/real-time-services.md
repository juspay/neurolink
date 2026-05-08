---
title: Real-time Voice Services
description: Bidirectional realtime voice via OpenAI Realtime and Gemini Live, accessed through the RealtimeProcessor static class and the neurolink serve voice command.
---

NeuroLink integrates the two major realtime voice APIs behind a single, provider-agnostic interface: **OpenAI Realtime** (`openai-realtime`) and **Google Gemini Live** (`gemini-live`). These let you build full-duplex voice agents where audio streams in and out simultaneously, with the model responding mid-utterance and calling tools in-flight.

Realtime voice is exposed through the `RealtimeProcessor` static class (not a method on the `NeuroLink` instance). For non-realtime synthesis and transcription, see the **[TTS Guide](tts.md)** and **[STT Guide](audio-input.md)**.

---

## Overview

| Capability     | `openai-realtime`               | `gemini-live`                   |
| -------------- | ------------------------------- | ------------------------------- |
| Provider value | `"openai-realtime"`             | `"gemini-live"`                 |
| Transport      | WebSocket                       | WebSocket / WebRTC              |
| Modalities     | audio in/out, text in/out       | audio in/out, text, video       |
| Tool calls     | Yes (via `onFunctionCall`)      | Yes (via `onFunctionCall`)      |
| Interruption   | Server-side VAD + manual cancel | Native barge-in + manual cancel |

Both APIs support concurrent audio input and output streams, so the user can interrupt the model mid-response and the model can stream audio while still listening for new input.

---

## Quick Start (SDK)

The `RealtimeProcessor` is a static class — there is no `new RealtimeProcessor()` and no `neurolink.openRealtimeSession(...)` method. Connect with `RealtimeProcessor.connect(provider, config, handlers)`:

```typescript
import { RealtimeProcessor } from "@juspay/neurolink";

// OpenAI Realtime
const session = await RealtimeProcessor.connect(
  "openai-realtime",
  {
    provider: "openai-realtime",
    model: "gpt-4o-realtime-preview",
    voice: "alloy",
    instructions: "You are a helpful voice assistant.",
  },
  {
    onAudio: (chunk) => speaker.write(chunk.audio),
    onTranscript: (text, isFinal) => {
      if (isFinal) console.log("User said:", text);
    },
    onError: (err) => console.error(err),
  },
);

// Send audio chunks (PCM16 mono 24kHz, raw Buffer or RealtimeAudioChunk)
await RealtimeProcessor.sendAudio("openai-realtime", audioChunk);

// Send text input alongside audio
await RealtimeProcessor.sendText("openai-realtime", "What's the weather?");

// Manually request a model response (for manual turn detection)
await RealtimeProcessor.triggerResponse("openai-realtime");

// Cancel an in-progress response (barge-in)
await RealtimeProcessor.cancelResponse("openai-realtime");

// Close the session
await RealtimeProcessor.disconnect("openai-realtime");
```

```typescript
// Gemini Live — same handler shape, just a different provider value
const session = await RealtimeProcessor.connect(
  "gemini-live",
  {
    provider: "gemini-live",
    model: "gemini-2.0-flash-live",
    instructions: "Speak naturally and ask follow-up questions.",
  },
  { onAudio, onTranscript, onError },
);
```

The handler shape is provider-agnostic: the same `RealtimeEventHandlers` object works across both providers, so you can switch with a single string change.

### Event handler reference

```typescript
type RealtimeEventHandlers = {
  onAudio?: (chunk: RealtimeAudioChunk) => void;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onText?: (text: string, isFinal: boolean) => void;
  onFunctionCall?: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<unknown>;
  onStateChange?: (state: RealtimeSessionState) => void;
  onError?: (error: Error) => void;
  onTurnStart?: () => void;
  onTurnEnd?: () => void;
};
```

---

## Quick Start (CLI)

NeuroLink does not ship a `neurolink voice realtime` interactive CLI. Instead, the realtime voice **server** is exposed via:

```bash
# Canonical: start the realtime voice WebSocket server
npx @juspay/neurolink serve voice --port 8081

# Deprecated alias (still works, prints a deprecation notice)
npx @juspay/neurolink voice-server --port 8081
```

Connect a browser/mobile client to `ws://localhost:8081/voice` to drive the session. The server bridges the client to the chosen provider (configured via env vars and per-session messages) and forwards events bidirectionally.

The TTS and STT _flags_ on `generate` / `stream` (e.g. `--tts`, `--stt`, `--input-audio`) are for non-realtime synthesis and transcription — see [TTS](tts.md) and [STT](audio-input.md).

---

## Self-hosted Realtime Voice Server

For multi-tenant deployments — voice bots, IVR-style applications, in-app voice features — NeuroLink ships a real-time voice agent server. It bridges browser/mobile clients to provider realtime APIs with session management, observability, and tool routing.

```typescript
// startVoiceServer is the canonical export
import { startVoiceServer } from "@juspay/neurolink/dist/lib/server/voice/voiceServerApp.js";

await startVoiceServer(8081);
```

> **Note:** the server is a function export (`startVoiceServer`), not a `NeuroLinkVoiceServer` class. To run it from the CLI, prefer `npx @juspay/neurolink serve voice --port 8081`.

The server emits OTEL spans + Langfuse traces per session, supports HITL approvals on tool calls, and can be deployed standalone or behind your own gateway.

---

## Provider Selection

| Use case                                                  | Recommended provider                                  |
| --------------------------------------------------------- | ----------------------------------------------------- |
| English-first, broad voice catalog, GPT-4o reasoning      | `openai-realtime`                                     |
| Multilingual, video input, lowest latency in many regions | `gemini-live`                                         |
| Customer support voice bots with structured tool calls    | `openai-realtime` (more deterministic function calls) |
| In-app voice search / multimodal queries                  | `gemini-live`                                         |

Either can be wrapped behind `providerFallback` so a model-access denial automatically falls through to the alternate model. See [Provider Fallback](/docs/features/provider-fallback) — note that the orchestrator only triggers on access-denied errors, not on rate limits or generic failures.

---

## Tool Calls Inside Realtime Sessions

Both providers can call functions registered with the realtime session. Use the `onFunctionCall` handler (not `onToolCall` — that name is reserved for the streaming-text API):

```typescript
const session = await RealtimeProcessor.connect(
  "openai-realtime",
  {
    provider: "openai-realtime",
    model: "gpt-4o-realtime-preview",
    tools: [
      {
        name: "lookupOrderStatus",
        description: "Look up the status of an order",
        parameters: {
          type: "object",
          properties: { id: { type: "string" } },
          required: ["id"],
        },
      },
    ],
  },
  {
    onFunctionCall: async (name, args) => {
      if (name === "lookupOrderStatus") {
        const order = await db.findOrder(args.id as string);
        return { status: order.status, eta: order.eta };
      }
    },
  },
);
```

When [HITL](hitl.md) middleware is wired in front of the function-call handler, sensitive operations (e.g. `cancelOrder`, `chargeCard`) pause for human approval before responding back into the realtime stream.

---

## Observability

Realtime sessions emit:

- `session:start`, `session:end` events with duration + token usage
- Per-utterance `transcript:user`, `transcript:assistant` events
- `tool:call`, `tool:result` events
- `audio:in:bytes`, `audio:out:bytes` for bandwidth tracking

These flow into the same OTEL/Langfuse pipeline as text generation. See the [Observability Guide](observability.md).

---

## Status & Inspection

```typescript
RealtimeProcessor.isConnected("openai-realtime"); // boolean
RealtimeProcessor.getProviders(); // string[] of registered providers
RealtimeProcessor.supports("openai-realtime"); // boolean
RealtimeProcessor.getSession("openai-realtime"); // RealtimeSession | null
RealtimeProcessor.getSupportedFormats("openai-realtime"); // TTSAudioFormat[]
```

---

## Related

- **[TTS Guide](tts.md)** — non-realtime text-to-speech (5 providers)
- **[STT Guide](audio-input.md)** — transcription (4 providers)
- **[Voice Agent Guide](/docs/features/voice-agent)** — building voice agents end-to-end
- **[Provider Fallback](/docs/features/provider-fallback)** — failover between models on access denial
- **[Observability](observability.md)** — wiring fallback events into your monitoring stack
