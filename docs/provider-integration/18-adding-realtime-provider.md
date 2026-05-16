# 18 · Adding a New Realtime (Bidirectional Voice) Provider — Exhaustive Guide

This guide adds a new realtime / bidirectional-voice provider (e.g., Hume EVI, Resemble.ai's WebSocket API, future OpenAI Realtime variants) to NeuroLink.

The pattern is established by `OpenAIRealtime` and `GeminiLive` shipped in commit `27a31c32`. Realtime providers transport audio in both directions over a persistent WebSocket; they are stateful, session-based, and don't fit cleanly into the request/response `generate()` flow. They have their own `RealtimeProcessor` registry.

---

## Critical caveat

Realtime providers are **registered but not yet exposed via public NeuroLink SDK methods** as of `v9.62.0`. They live in `RealtimeProcessor` waiting to be surfaced. The voice-server (`src/lib/server/voice/voiceWebSocketHandler.ts`) is the primary consumer today. New realtime additions will likely need:

1. The handler class (this guide).
2. Server-side wiring in `voiceWebSocketHandler.ts` if the WebSocket protocol differs significantly from OpenAI Realtime / Gemini Live.
3. Eventually, an SDK surface — but that's a larger architectural decision and out of scope for individual provider PRs.

---

## TL;DR — The 6-file checklist

| #   | File                                         | Action                                        |
| --- | -------------------------------------------- | --------------------------------------------- |
| 1   | `src/lib/voice/providers/<Name>Realtime.ts`  | NEW — handler extending `BaseRealtimeHandler` |
| 2   | `src/lib/factories/providerRegistry.ts`      | EDIT — registration in realtime block         |
| 3   | `src/lib/voice/index.ts`                     | EDIT — re-export class                        |
| 4   | `src/lib/types/voice.ts`                     | EDIT — add to `VoiceProviderName` union       |
| 5   | `.env.example`                               | EDIT — env vars                               |
| 6   | `test/continuous-test-suite-voice-server.ts` | EDIT — add test section                       |

Plus `docs/getting-started/providers/<name>.md` and updates to `docs/features/voice-agent.md` / `docs/features/real-time-services.md`.

---

## Architecture

```
RealtimeProcessor.connect(provider, config) → Promise<RealtimeSession>
   ↓
handler = RealtimeProcessor.handlers.get(provider.toLowerCase())
   ↓
handler extends BaseRealtimeHandler (src/lib/voice/RealtimeVoiceAPI.ts)
   ↓
handler.connect(config) → opens WebSocket, returns RealtimeSession
   ↓
session.on('audio', cb) / session.send(audioChunk) / session.disconnect()
```

`BaseRealtimeHandler` (in `src/lib/voice/RealtimeVoiceAPI.ts`) provides connection state, session lifecycle, and `EventEmitter` plumbing. Concrete handlers extend it and implement protocol-specific logic.

`RealtimeProcessor` is at the bottom of `RealtimeVoiceAPI.ts` — a static handler registry mirroring `TTSProcessor` / `STTProcessor`. Per-handler outcomes are tracked on `ProviderRegistry.realtimeRegistration` so health-check endpoints can surface which realtime providers loaded successfully (the `realtimeOutcomes` pattern in `providerRegistry.ts:615-664`).

---

## Step 1 — Create the handler class

**File:** `src/lib/voice/providers/<Name>Realtime.ts` — NEW.

Skeleton, modelled on `OpenAIRealtime.ts:1-475`:

```typescript
import WebSocket from "ws";

import { ErrorCategory, ErrorSeverity } from "../../constants/enums.js";
import { RealtimeError } from "../errors.js";
import {
  BaseRealtimeHandler,
} from "../RealtimeVoiceAPI.js";
import type {
  RealtimeAudioChunk,
  RealtimeConfig,
  RealtimeSession,
  RealtimeSessionState,
} from "../../types/index.js";
import { logger } from "../../utils/logger.js";

const DEFAULT_URL = "wss://api.<provider>.com/v1/realtime";
const RECONNECT_BACKOFF_MS = [500, 1000, 2000, 4000];

export class <Name>Realtime extends BaseRealtimeHandler {
  protected readonly providerName = "<provider-name>";

  private apiKey: string | null;
  private ws: WebSocket | null = null;

  constructor(apiKey?: string) {
    super();
    const resolved = (apiKey ?? process.env.<NAME>_API_KEY ?? "").trim();
    this.apiKey = resolved.length > 0 ? resolved : null;
  }

  isConfigured(): boolean {
    return this.apiKey !== null;
  }

  async connect(config: RealtimeConfig): Promise<RealtimeSession> {
    if (!this.apiKey) {
      throw RealtimeError.providerNotConfigured("<provider-name>");
    }
    if (this.state === "connected") {
      throw RealtimeError.sessionAlreadyActive("<provider-name>");
    }

    const url = config.url ?? DEFAULT_URL;

    this.setState("connecting");

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          // Provider-specific headers, e.g.:
          // "OpenAI-Beta": "realtime=v1",
        },
      });

      const session = this.createSession(config);

      this.ws.on("open", () => {
        this.setState("connected");
        // Send initial session config (system prompt, voice, format)
        this.sendSessionUpdate(config);
        resolve(session);
      });

      this.ws.on("message", (data: WebSocket.RawData) => {
        try {
          const event = JSON.parse(data.toString());
          this.handleUpstreamEvent(event, session);
        } catch (err) {
          logger.error(`[<Name>Realtime] Failed to parse upstream event`, err);
        }
      });

      this.ws.on("error", (err) => {
        this.setState("error");
        const wrapped = RealtimeError.connectionFailed(
          "<provider-name>",
          err.message,
        );
        this.emit("error", wrapped);
        if (this.state === "connecting") reject(wrapped);
      });

      this.ws.on("close", (code, reason) => {
        this.setState("disconnected");
        this.emit("disconnect", { code, reason: reason.toString() });
      });
    });
  }

  async send(audio: RealtimeAudioChunk): Promise<void> {
    if (!this.ws || this.state !== "connected") {
      throw RealtimeError.sessionNotActive("<provider-name>");
    }
    // Provider-specific message envelope, e.g. OpenAI Realtime:
    // { type: "input_audio_buffer.append", audio: base64 }
    this.ws.send(JSON.stringify({
      type: "audio.input",
      data: audio.data.toString("base64"),
      format: audio.format,
    }));
  }

  async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close(1000, "client_disconnect");
      this.ws = null;
    }
    this.setState("disconnected");
  }

  private sendSessionUpdate(config: RealtimeConfig): void {
    if (!this.ws) return;
    this.ws.send(JSON.stringify({
      type: "session.update",
      session: {
        modalities: config.modalities ?? ["audio", "text"],
        voice: config.voice ?? "alloy",
        instructions: config.instructions,
        input_audio_format: config.audioFormat ?? "wav",
        output_audio_format: config.audioFormat ?? "wav",
        // Provider-specific extras
      },
    }));
  }

  private handleUpstreamEvent(
    event: unknown,
    session: RealtimeSession,
  ): void {
    const e = event as { type?: string; [k: string]: unknown };
    switch (e.type) {
      case "response.audio.delta":
        this.emit("audio", {
          data: Buffer.from(e.delta as string, "base64"),
          format: "wav",
          isFinal: false,
        });
        break;
      case "response.text.delta":
        this.emit("text", e.delta as string);
        break;
      case "response.done":
        this.emit("response_complete", e);
        break;
      case "error":
        this.emit("error", RealtimeError.protocolError(
          "<provider-name>",
          (e.error as { message?: string })?.message ?? "Unknown",
        ));
        break;
      // Map all upstream event types your provider emits
    }
  }
}
```

### Conventions

| Convention                                                                                     | Rationale                                                                             |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **Extend `BaseRealtimeHandler`** (not just implement `RealtimeHandler`)                        | Get connection state machine, session lifecycle, `EventEmitter` plumbing free         |
| **Use `ws` (npm package)**                                                                     | Already in dependencies via the voice integration; avoids adding a new dep            |
| **Track `state` via `setState`**                                                               | Surfaces in `getRegistrationReport` and `voiceServerApp` health endpoints             |
| **`RealtimeError` static factories**                                                           | Same convention as `STTError`; defined in `voice/errors.ts:300-455`                   |
| **Map provider events → standard events**                                                      | Consumers shouldn't have to switch on provider-specific event names                   |
| **Standard events: `audio`, `text`, `response_complete`, `error`, `disconnect`**               | The voice-server consumer relies on these; new event types are fine but document them |
| **Send audio as `RealtimeAudioChunk`** with `data` (Buffer), `format`, `sampleRate`, `isFinal` | Established input shape — receivers may need to resample                              |
| **Provider-specific session config** in `sendSessionUpdate`                                    | Encapsulates the upstream's `session.update` (or equivalent) message structure        |

---

## Step 2 — Register in providerRegistry.ts

**File:** `src/lib/factories/providerRegistry.ts` — realtime block (~line 606):

```typescript
try {
  const { <Name>Realtime } = await import("../voice/providers/<Name>Realtime.js");
  RealtimeProcessor.registerHandler(
    "<provider-name>",
    new <Name>Realtime(),
  );
  realtimeOutcomes["<provider-name>"] = "ok";
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  realtimeOutcomes["<provider-name>"] = msg;
  // Realtime is fewer providers, each more notable when missing — log at error level
  logger.error(
    `[ProviderRegistry] <provider-name> registration failed: ${msg}`,
  );
}
```

The `realtimeOutcomes` map is reported via `ProviderRegistry.getRegistrationReport()`. Because realtime providers are inherently stateful and a missing one disables a real feature, registration failures are visible at `error` level (vs `debug` for TTS — see `14-voice-speech-integration.md` for the rationale).

---

## Step 3 — Add barrel export

**File:** `src/lib/voice/index.ts`:

```diff
 // ============================================================================
 // REALTIME PROVIDERS
 // ============================================================================
 ...
+export {
+  <Name>Realtime,
+  <Name>Realtime as <Name>RealtimeHandler,
+} from "./providers/<Name>Realtime.js";
```

---

## Step 4 — Update VoiceProviderName

```diff
 // Realtime providers
 | "openai-realtime"
 | "gemini-live"
+| "<provider-name>"
```

If your provider has provider-specific config beyond `RealtimeConfig`, add it to `voice.ts`:

```typescript
export type <Name>RealtimeConfig = RealtimeConfig & {
  voice?: "<provider-voice-1>" | "<provider-voice-2>";
  responseFormat?: "audio" | "text";
  // ... provider-specific
};
```

---

## Step 5 — .env.example

```bash
# =============================================================================
# <PROVIDER> REALTIME CONFIGURATION
# =============================================================================
<NAME>_API_KEY=
# Optional: WebSocket URL override
# <NAME>_REALTIME_URL=wss://api.<provider>.com/v1/realtime
```

---

## Step 6 — Tests

**File:** `test/continuous-test-suite-voice-server.ts` (the realtime test surface).

Realtime providers are tested via the voice-server (`src/lib/server/voice/voiceWebSocketHandler.ts`). The existing test file exercises the OpenAI Realtime + Gemini Live pipelines end-to-end — clone one of those test sections.

A direct handler-level smoke test can also live in `test/continuous-test-suite-voice.ts` test #11 (handler registration check):

```typescript
{
  name: "<Provider>Realtime registered",
  fn: async () => {
    const { RealtimeProcessor } = await import("@juspay/neurolink");
    return RealtimeProcessor.supports("<provider-name>");
  },
},
```

---

## Voice-server integration (when needed)

If your realtime provider's wire format differs from OpenAI Realtime / Gemini Live, you may need to teach `voiceWebSocketHandler.ts:1161` the new event types. The existing handler dispatches based on the connected provider:

```typescript
realtimeSession.on("audio", (chunk) => {
  ws.send(/* re-frame for downstream client */);
});
realtimeSession.on("text", (delta) => {
  /* ... */
});
realtimeSession.on("error", (err) => {
  /* ... */
});
```

If your provider emits events the existing dispatcher doesn't handle, extend the dispatcher rather than the handler — keep the handler purely a protocol adapter.

---

## Validation gates

```bash
pnpm run check && pnpm run lint && pnpm run build
pnpm run test:voice
pnpm run test:servers   # voice-server integration tests
# Smoke test:
pnpm run cli voiceServer
# (then connect with the example client from docs/features/voice-agent.md)
```

After build, verify the registration outcome:

```typescript
import { ProviderRegistry } from "@juspay/neurolink";
await ProviderRegistry.registerAllProviders();
console.log(ProviderRegistry.getRegistrationReport());
// { realtime: { "openai-realtime": "ok", "gemini-live": "ok", "<provider-name>": "ok" } }
```

---

## Common pitfalls

| Pitfall                                                                                 | Fix                                                                                        |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Used native `WebSocket` (browser) instead of `ws` (Node.js)                             | Build error; the codebase runs in Node and Node-compatible bundlers, not browsers directly |
| Forgot the auth header customisation OpenAI Realtime needs (`OpenAI-Beta: realtime=v1`) | Connection establishes but the model rejects the session                                   |
| Used `JSON.parse` without try/catch on upstream messages                                | Malformed messages crash the handler; one bad event takes down the whole session           |
| Didn't handle `1006` close code                                                         | Some providers close abruptly; treat as recoverable error and emit a typed event           |
| Didn't surface state changes via `setState`                                             | `getRegistrationReport` shows wrong status; health endpoints lie                           |
| Mapped audio without `isFinal` flag                                                     | Consumers can't tell when the response stream ended                                        |
| Sent text before connection was `connected`                                             | `RealtimeError.sessionNotActive` is the right shape — don't quietly buffer                 |

---

## See also

- [`14-voice-speech-integration.md`](14-voice-speech-integration.md) — voice integration journal
- [`16-adding-tts-provider.md`](16-adding-tts-provider.md), [`17-adding-stt-provider.md`](17-adding-stt-provider.md) — sibling modalities
- `src/lib/voice/RealtimeVoiceAPI.ts` — `BaseRealtimeHandler` + `RealtimeProcessor` source
- `src/lib/voice/providers/OpenAIRealtime.ts` — most thorough reference
- `src/lib/voice/providers/GeminiLive.ts` — alternative protocol reference
- `docs/features/voice-agent.md` — user-facing realtime docs
- `docs/features/real-time-services.md` — broader realtime architecture
