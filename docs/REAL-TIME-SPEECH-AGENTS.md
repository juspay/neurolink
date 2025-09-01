# Speech-to-Speech Agents: Architecture and Gemini Live Integration Plan

Status: Proposal (Docs only)
Owner: NeuroLink Platform
Last updated: 2025-09-01

## Goals

- Use `NeuroLink.stream` as the single, unified API for both text and voice streaming (no separate engine entrypoint).
- Start with Google Gemini Live API (Studio) as the first realtime provider.
- Server-level only: users attach their own WebSocket(s) and forward events; we do not host WS in the SDK.
- Keep the design provider-agnostic to allow adding OpenAI Realtime, ElevenLabs, Azure Speech, etc.

## Scope (Phase 1)

- Extend `neurolink.stream` to accept audio input frames and emit audio output events (audio-only out).
- Provider: Google Gemini Live (Studio) bridged internally from the stream code path.
- No built-in HTTP/WS server: consumers maintain their own transport and forward events.
- Basic audio guidance (PCM16LE framing, resampling hints); no full DSP stack.
- Config via env; minimal telemetry via existing logger.

Non-goals (Phase 1):

- Building a client/browser UI or bundling web audio capture.
- Managing customer WebSocket endpoints and broadcasting logic.
- Advanced AEC/AGC/VAD DSP processing. We’ll document expectations and provide simple utilities only.
- Persisted conversation memory integration (initially). We’ll design for it; implementation can follow.

## High-Level Architecture (Stream-Centric)

```
┌──────────────────────────┐
│  Application Server      │
│  (your Express/Fastify)  │
├──────────────────────────┤
│  Your WS endpoints       │  ◀── you own creation & forwarding to clients
│  - /ws/input             │
│  - /ws/output            │
├──────────────────────────┤
│  NeuroLink.stream        │
│  - StreamOptions (extended)            │ voice/text input
│  - AsyncIterable<StreamEvent>          │ voice/text output
│  - Audio helpers (lightweight)         │ PCM framing/resampling guidance
│  - Telemetry hooks (minimal in P1)     │
├──────────────────────────┤
│  Providers               │
│  - GeminiLiveProvider    │  (Phase 1)
│  - OpenAIRealtime        │  (Phase 2+)
│  - ... others            │
└──────────────────────────┘

       ▲                                      │
       │ events (audio/text/tools/status)     │ ws/grpc over provider SDK
       │ sendAudio/sendText/flush/control     ▼
                Provider SDK (e.g. @google/genai or Vertex Live API)
```

## Proposed Changes (Stream Extensions Only)

- Extend `StreamOptions` to support audio input alongside text:
  - `input: { text?: string; audio?: { frames: AsyncIterable<Buffer>; sampleRateHz: number; encoding: 'PCM16LE'; channels?: 1 } }`
- Extend `StreamResult.stream` to yield discriminated events:
  - `AsyncIterable< { type: 'audio'; audio: AudioChunk } | { type: 'text'; content: string } >`
- Add `AudioChunk` type: `{ data: Buffer; sampleRateHz: number; channels: number; encoding: 'PCM16LE' }`
- No new top-level entrypoints; keep `neurolink.stream()` as the single API.

Phase 2 (NeuroLink Client — new SDK package) planned modules:

- Package name: `@juspay/neurolink-client` (new package from scratch)
- Repository layout: monorepo subpackage `packages/neurolink-client/` (or separate repo if preferred)
- `packages/neurolink-client/src/index.ts` — central exports for browser/client usage
- `packages/neurolink-client/src/types.ts` — client-side event and message types
- `packages/neurolink-client/src/wsBridge.ts` — WebSocket bridge (send/receive) with pluggable codecs
- `packages/neurolink-client/src/codecs/{json,binary}.ts` — default JSON and optional binary audio codecs
- `packages/neurolink-client/src/utils/{base64,pcm}.ts` — helpers for encoding/PCM16LE framing

No additional public entrypoints planned beyond `neurolink.stream`.

## Stream API Extensions (Provider-Agnostic)

### Extended Types

```ts
// Additions to existing StreamOptions (src/lib/types/streamTypes.ts)
type PCMEncoding = "PCM16LE";

interface AudioInputSpec {
  frames: AsyncIterable<Buffer>; // PCM16LE mono frames (20–60ms recommended)
  sampleRateHz: number; // usually 16000 for input
  encoding: PCMEncoding; // 'PCM16LE'
  channels?: 1; // Phase 1: mono
}

interface AudioChunk {
  data: Buffer;
  sampleRateHz: number; // Gemini typically 24000 on output
  channels: number; // 1
  encoding: PCMEncoding; // 'PCM16LE'
}

// StreamOptions extension
// input: { text: string } remains valid for text-only flows
interface ExtendedStreamInput {
  text?: string;
  audio?: AudioInputSpec;
}

// StreamResult extension: discriminated union events
type StreamEvent =
  | { type: "text"; content: string }
  | { type: "audio"; audio: AudioChunk };
```

### Session Lifecycle

```ts
interface SpeechSession {
  id: string;
  start(): Promise<void>;
  close(code?: number, reason?: string): Promise<void>;

  // Sending upstream (server → provider)
  sendAudioFrame(
    pcm16le: Buffer,
    sampleRateHz: number,
    opts?: { endOfSegment?: boolean },
  ): void;
  sendText(text: string): void; // optional text prompts/messages
  flush(): void; // request model to produce output

  // Events (subscribe and forward over your WS)
  on(event: "audio", listener: (chunk: AudioChunk) => void): this;
  on(event: "text", listener: (delta: TextDelta) => void): this;
  on(event: "tool-call", listener: (call: ToolCallEvent) => void): this; // future
  on(event: "tool-result", listener: (res: ToolResultEvent) => void): this; // future
  on(event: "status", listener: (s: ProviderStatusEvent) => void): this;
  on(event: "error", listener: (err: Error) => void): this;
  on(
    event: "close",
    listener: (info: { code?: number; reason?: string }) => void,
  ): this;
}

interface AudioChunk {
  data: Buffer;
  sampleRateHz: number;
  channels: number;
  encoding: "PCM16LE";
}
interface TextDelta {
  text: string;
  isFinal?: boolean;
}
```

### Provider Bridging

Each provider’s existing `stream()` implementation will detect `input.audio` and bridge to the provider’s live API, mapping provider callbacks to the unified stream events defined above.

## Gemini Live Mapping (Phase 1 via stream)

Two access modes are planned:

1. Studio API via `@google/genai` (API key)

- Env: `GOOGLE_AI_API_KEY` (alias: `GEMINI_API_KEY`)
- Connect: `client.live.connect({ model, callbacks, config })`
- Pros: simple setup; good for quick start.

2. Vertex AI Live API (service account)

- Env: `GOOGLE_APPLICATION_CREDENTIALS` (or inline credentials), `GOOGLE_VERTEX_PROJECT`, `GOOGLE_VERTEX_LOCATION`
- SDK: `@google-cloud/vertexai` once parity for Live is stable; alternatively direct WS following docs.
- Pros: enterprise auth, quota, monitoring; aligns with existing Vertex usage in repo.

Phase 1 decision (locked): use Studio channel via `@google/genai` as the primary path; output is audio-only. Vertex channel and other capabilities move to Phase 2.

Reference docs (sourced for details):

- Live API overview: https://cloud.google.com/vertex-ai/generative-ai/docs/live-api
- Streamed conversations: https://cloud.google.com/vertex-ai/generative-ai/docs/live-api/streamed-conversations
- Tools with Live API: https://cloud.google.com/vertex-ai/generative-ai/docs/live-api/tools

### Provider Config (Phase 1)

```ts
// Internally, provider config sets:
// responseModalities: ['AUDIO']
// speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName = 'Orus' (default)
// Optional languageCode
```

### Event Mapping (Phase 1)

- Provider parses `LiveServerMessage.serverContent.modelTurn.parts[]`.
- If `inlineData` audio present, yield event `{ type: 'audio', audio: { data, sampleRateHz: 24000, encoding: 'PCM16LE', channels: 1 } }`.
- Text deltas: deferred to Phase 2.
- `serverContent.interrupted === true`: emit `status` `{ type: 'interrupted' }` and stop/flush local playback queues.
- onopen/onclose/onerror: map to `status`/`close`/`error`.
- Tools (Phase 2): `serverContent.toolCall` → `tool-call` event for integration with MCP pipeline.

Additional Live API behaviors from docs:

- Turn-based and streaming: you can stream user audio continuously (client → model) and receive overlapping model audio replies (server → client). Many realtime APIs also support an explicit end-of-input signal to prompt the model to respond; consult the Streamed Conversations doc for Gemini-specific control messages.
- Interruptions: the server may signal interruptions mid-playback when new input arrives; handle by stopping queued audio (as shown in sample) and resetting `nextStartTime`.

### Audio Expectations (Phase 1)

- Upstream format: PCM16LE mono, recommended 16 kHz. If clients provide 44.1/48 kHz float32, resample then convert to PCM16LE.
- Downstream format: Gemini typically outputs 24 kHz PCM; we’ll emit chunks with `sampleRateHz=24000`.
- Utilities will include minimal conversion helpers; full DSP left to consumers or future phases.

Notes aligned to docs:

- The Live API accepts mixed modalities (audio and text) in the same session. Sending text messages mid-conversation is supported.
- For low-latency, send small audio frames frequently (e.g., 20–60ms worth per frame) instead of large buffers.

## Server-Level Usage with `neurolink.stream` (Phase 1)

```ts
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Build an AsyncIterable<Buffer> of PCM16LE mono frames at 16kHz from your WS/client
async function* framesFromClient(wsConn) {
  for await (const msg of wsConn) {
    // msg is already a Buffer of PCM16LE mono (16kHz)
    yield msg as Buffer;
  }
}

const streamResult = await neurolink.stream({
  provider: "google-ai", // internally routed to Gemini Live (Studio) for audio
  model: "gemini-2.5-flash-preview-native-audio-dialog",
  input: {
    audio: {
      frames: framesFromClient(clientWs),
      sampleRateHz: 16000,
      encoding: "PCM16LE",
    },
  },
});

for await (const ev of streamResult.stream) {
  if ((ev as any).type === "audio") {
    // Forward Buffer to clients over your WS
    serverWs.send((ev as any).audio.data);
  }
}
```

## Configuration (Phase 1)

- Studio:
  - `GOOGLE_AI_API_KEY` (preferred) or `GEMINI_API_KEY`
- Vertex channel is deferred to Phase 2.

Studio channel uses `@google/genai` Live SDK semantics (client.live.connect).

The subsystem follows the project’s dotenv loading pattern. No hard dependency added to runtime unless the feature is used.

## Telemetry & Logging

- Phase 1: reuse `src/lib/utils/logger.ts` for structured logs; expose minimal counters (session count, bytes in/out, errors). OTEL deferred.
- Phase 2+: optional OpenTelemetry spans (connect, sendAudio, receiveAudio, flush, close) with attributes: provider, model, channel (studio|vertex), sessionId, sampleRates, bytesIn/bytesOut, firstAudioLatencyMs.

## Error Handling & Resilience

- Categorize errors: auth (401/403), network (WS close abnormal), rate limit, server (5xx), protocol (invalid frame).
- Configurable backoff on reconnect for transient failures; max retries per session.
- Surface provider close codes/reasons to consumers.
- Guardrails on input audio (size/rate), with backpressure callbacks.
- Vertex-specific items (regional endpoints/quotas, close code mapping) are Phase 2.

## Extensibility (Other Providers)

- Implement provider-specific live bridging in the existing `stream()` path:
  - Detect `input.audio` and route to the provider’s live API (e.g., OpenAI Realtime, ElevenLabs, Azure).
  - Map provider callbacks to stream events: `{ type: 'audio' }` and, in Phase 2, `{ type: 'text' }`.
- Optional capability flags: `supports.tools` (P2), `supports.duplex`, `supports.textDelta` (P2), `input.sampleRates`.
  - For providers like OpenAI Realtime, add `supports.webrtc` if WebRTC control is planned (P3).

## Tools Integration (Phase 2)

- Gemini Live tools map well to our MCP infrastructure.
- Plan: bridge provider tool-calls to NeuroLink MCP registry (`src/lib/mcp/**`).
- The streaming pipeline surfaces `tool-call` intents; execute via NeuroLink MCP; return `tool-result` back to the provider stream.
  - Based on docs, Live API supports tool/function execution mid-session; we’ll translate those to our MCP tool contract and return results back through the provider’s tool result pathway.

## Voice Catalog & Advanced Controls (Phase 3)

- Voice catalog discovery for Gemini Live; expose `listVoices()` and cache results.
- Dynamic voice switching mid-session (where supported).
- Advanced prosody/style parameters; SSML-like controls if surfaced by provider.
- Diarization/transcription toggles; dual-stream (audio+text) combined experiences.
- Optional WS/WebRTC adapters and client helpers.

## Security Considerations

- Never expose service account creds to clients. Server-only control.
- Validate audio frame size/rate from clients; apply quotas.
- Consider PII handling and retention policies for recorded buffers.
- Support regionality via Vertex location settings.

## Implementation Phases & Steps

### Phase 1 (Now): Studio + Audio-Only

1. Scaffolding (core contracts)
   - Add `src/lib/realtime/{types,events,provider,session,engine}.ts`.
   - Minimal audio utils: `audio/pcm.ts` (PCM16LE framing) and `audio/resample.ts` (optional).
   - Add planned exports to `src/lib/index.ts` (guarded if needed).
2. Gemini Live Provider (Studio)
   - Implement via `@google/genai` (`client.live.connect`).
   - Map callbacks to `audio`/`status`/`error`/`close`; no text deltas.
   - Normalize output audio to `{ data: Buffer, sampleRateHz: 24000, encoding: 'PCM16LE' }`.
3. Session API & Controls
   - Implement `sendAudioFrame`, `flush`, `start`, `close`.
   - Backpressure safety (drop/queue strategy when overwhelmed).
4. Minimal Telemetry & Logging
   - Counters: session count, bytes in/out, errors; debug logs.
5. Smoke Tests & Example
   - Synthetic audio roundtrip test.
   - Example usage snippet in docs (no WS server bundled).

### Phase 2: Vertex, Text & Tools

1. Vertex Live API Channel
   - WS connection to Vertex regional endpoint; env-driven project/location.
2. Text Deltas
   - Enable `text` events; downstream subtitle-like handling.
3. Tools Integration
   - Bridge Live API tool calls to NeuroLink MCP; emit `tool-call`/`tool-result`.
4. Telemetry (OTEL)
   - Add optional spans and metrics; health endpoints.
5. NeuroLink Client SDK (WS bridge — new package)

   - Build a brand-new client SDK as a separate npm package `@juspay/neurolink-client`.
   - Connects to your server’s WS endpoint; no audio capture/playback included.
   - Responsibilities: send upstream audio frames and control messages to server; receive downstream audio/status/text events from server.
   - Default wire protocol (JSON envelope; optional binary audio):
     - Upstream JSON: `{ type: 'audio', data: <base64>, sampleRateHz: 16000, encoding: 'PCM16LE' }`
     - Upstream control: `{ type: 'flush' }`, `{ type: 'text', text: string }`
     - Downstream JSON: `{ type: 'audio', data: <base64>, sampleRateHz: 24000, encoding: 'PCM16LE' }`, `{ type: 'status', status: string }`, `{ type: 'text', text: string }` (if enabled)
     - Optional binary mode: raw PCM16LE frames with configurable header disabled by default.
   - Planned API:

     ```ts
     import { createRealtimeClient } from "@juspay/neurolink-client";

     const client = createRealtimeClient({
       url: "wss://your-server/ws",
       authToken,
       sendBinaryAudio: false,
     });

     client.on("audio", (chunk) => {
       /* play or forward */
     });
     client.on("status", (s) => {
       /* UI indicators */
     });

     // push audio captured elsewhere (already PCM16LE mono @16kHz)
     client.sendAudioFrame(pcmBuffer, 16000);
     client.flush();
     client.close();
     ```

   - The SDK won’t capture audio or render playback; it only bridges events over WS.
   - Packaging: ESM-first, tree-shakeable, no Node-only deps; minimal peer deps.

6. CLI Helpers (optional)
   - `neurolink live status`, basic debugging commands.

### Phase 3: Voice Catalog & Advanced Features

1. Voice Catalog
   - `listVoices()` with cache; per-model voice metadata.
2. Advanced Audio Controls
   - Prosody/style, SSML-like parameters, dynamic voice switching.
3. Transcription & Diarization
   - Expose toggles and events; combined audio+text pipelines.
4. WS/WebRTC Adapters (optional)
   - Lightweight helpers for common server/client patterns.

## Task Checklist

### Phase 1 — Studio + Audio-Only (via stream)

- [ ] Extend `StreamOptions` to accept `input.audio` (PCM16LE frames @16kHz).
- [ ] Extend `StreamResult.stream` to yield `{ type: 'audio', audio: AudioChunk }` events.
- [ ] Implement Gemini Live (Studio) bridging in provider stream path when `input.audio` is present.
- [ ] Default voice and output sample rate: Orus @24kHz; normalize `AudioChunk` accordingly.
- [ ] Minimal telemetry/logging: session count, bytes in/out, error count; debug logs.
- [ ] Smoke test: synthetic audio input → audio output events.
- [ ] Documentation: server usage snippet and guidance for WS forwarding.

### Phase 2 — Vertex, Text, Tools, Client SDK

- [ ] Implement Vertex Live API channel (WS) with `GOOGLE_VERTEX_PROJECT`/`GOOGLE_VERTEX_LOCATION` env support.
- [ ] Enable text delta events and downstream handling.
- [ ] Bridge Live API tool-calls to MCP; emit `tool-call`/`tool-result` events and roundtrip to provider.
- [ ] Add optional OpenTelemetry spans/metrics (connect/send/receive/flush/close).
- [ ] Create new package `@juspay/neurolink-client` (ESM, browser-first).
- [ ] Implement client WS bridge (`wsBridge.ts`) and message codecs (`codecs/{json,binary}.ts`).
- [ ] Define client SDK types and API (`createRealtimeClient`, `sendAudioFrame`, `flush`, events).
- [ ] Client SDK documentation and example integration.
- [ ] Optional: CLI helpers (e.g., `neurolink live status`).

### Phase 3 — Voice Catalog & Advanced Controls

- [ ] Implement `listVoices()` discovery and caching for Gemini Live.
- [ ] Support dynamic voice switching mid-session (where supported).
- [ ] Add advanced prosody/style/SSML-like parameters (provider-permitting).
- [ ] Add transcription/diarization toggles and corresponding events.
- [ ] Optional server/client helpers for WS/WebRTC patterns.

## Open Questions for Review

- Minimum audio contract for upstream: we recommend PCM16LE 16 kHz mono; OK to lock this as a requirement for Phase 1?
- Client WS protocol: keep default JSON + base64 audio with opt-in binary? Any constraints from your infra?
- Do we want a tiny built-in WS helper (opt-in) in Phase 3 for servers, or keep strictly library-only on server side?

---

If this plan looks good, next step is to extend the `stream` types and implement the Gemini Live (Studio) provider bridging for audio, keeping all server transport concerns outside the library as requested.
