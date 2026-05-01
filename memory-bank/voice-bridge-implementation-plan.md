# Voice Bridge Implementation Plan

## Status: In Progress
## Created: 2026-04-16
## Author: Sachin Sharma / Claude Code

---

## 1. Goals & Non-Goals

**Goals:**
- New TTS providers (OpenAI, ElevenLabs, Azure) work with the existing `generate({ tts: ... })` API
- New STT capability is added with the same shape as TTS (`generate({ stt: ... })`)
- Realtime voice (OpenAI Realtime, Gemini Live) works through a clean SDK API
- The voice server (`neurolink voice-server`) becomes provider-pluggable
- One registry per concern (TTS, STT, Realtime) — no parallel registries
- Full observability coverage matching `TTSProcessor` (spans, metrics, error categorization)
- Test coverage in `continuous-test-suite-*.ts` format

**Non-Goals:**
- No new top-level SDK methods unless absolutely needed (consumers use `generate()`/`stream()`)
- No breaking changes to existing `TTSOptions`/`TTSResult`/voice-server APIs
- No browser-specific changes (we're SDK + Node CLI only)
- Don't expose `VoiceFactory`, `STTProcessor`, etc. as public API — internal only

---

## 2. Project Conventions Checklist

Every change must follow these (from CLAUDE.md):

| Rule | Application |
|------|-------------|
| Dynamic imports in registry | All new provider registrations use `await import(...)` |
| Types in `src/lib/types/` | All new types go in `voice.ts`, `stt.ts`, or `realtime.ts` (under `types/`) |
| `type` not `interface` | New STT/Realtime contracts are `type` aliases |
| Barrel imports for internal types | All `import type {...} from "../types/index.js"` |
| `formatProviderError` returns | Error formatters return, never throw |
| `logger.shouldLog("debug")` guards | Wrap expensive serialization |
| Factory + Registry pattern | `STTProcessor`, `RealtimeProcessor` mirror `TTSProcessor` exactly |
| Observability spans | Every external call wrapped in a span with `SpanType.*` |
| Tests in `continuous-test-suite-*.ts` | tsx-based, no vitest |

---

## 3. Architecture: The Bridge

```
┌─────────────────────────────────────────────────────────────────┐
│ Consumer Surface (unchanged for TTS, additive for STT/Realtime) │
├─────────────────────────────────────────────────────────────────┤
│  neurolink.generate({ tts: {...}, stt: {...} })                 │
│  neurolink.stream({ tts: {...}, stt: {...} })                   │
│  neurolink.transcribe(audio, { provider, ... })   ← thin wrapper│
│  neurolink.startRealtimeSession({ provider, ... })← thin wrapper│
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│  BaseProvider.generate() / .stream()                            │
│   ├─ if (options.stt?.enabled) → STTProcessor.transcribe()      │
│   ├─ executeStandardGenerateFlow() (LLM call)                   │
│   └─ if (options.tts?.enabled) → TTSProcessor.synthesize()      │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌─────────────┬────────────▼────────────┬──────────────────────┐
│ TTSProcessor│   STTProcessor (NEW)    │  RealtimeProcessor   │
│ (existing)  │   mirror of TTSProcessor│  (rewired)           │
├─────────────┼─────────────────────────┼──────────────────────┤
│ TTSHandler  │   STTHandler            │  RealtimeHandler     │
└──────┬──────┴────────────┬────────────┴──────────┬───────────┘
       │                   │                       │
┌──────▼──────────┬────────▼────────┬──────────────▼───────────┐
│ src/lib/        │ src/lib/        │ src/lib/                 │
│ adapters/tts/   │ adapters/stt/   │ adapters/realtime/ (NEW) │
│ ───────────────│ ──────────────  │ ─────────────────────────│
│ google.ts      │ google.ts       │ openai.ts                │
│ openai.ts (NEW)│ whisper.ts      │ gemini.ts                │
│ elevenlabs(NEW)│ deepgram.ts     │                          │
│ azure.ts (NEW) │ azure.ts        │                          │
│ cartesia.ts*   │ assemblyai.ts   │                          │
│ (* not handler;│ gladia.ts       │                          │
│  streaming WS) │                 │                          │
└────────────────┴─────────────────┴──────────────────────────┘
       ▲                  ▲                      ▲
       │                  │                      │
┌──────┴──────────────────┴──────────────────────┴──────────────┐
│ Voice Server (now pluggable)                                  │
│  STTProcessor.transcribe()  TTSProcessor.synthesize()         │
│  Configurable via VOICE_STT_PROVIDER / VOICE_TTS_PROVIDER     │
└────────────────────────────────────────────────────────────────┘
```

**Three things go away:**
- `VoiceFactory` and `VoiceRegistry` (parallel registry — replaced by Processor pattern)
- `CompositeVoice` and `VoiceAgent` (orchestrators — replaced by `generate({ stt, tts })`)
- All duplicated provider classes in `src/lib/voice/providers/` (canonical homes are `src/lib/adapters/{tts,stt,realtime}/`)

---

## 4. Implementation Phases

### Phase 0 — Type Consolidation (foundation)

**Goal:** Single source of truth for voice types, eliminate duplicates.

**Files:**

| Action | File | Purpose |
|--------|------|---------|
| Keep | `src/lib/types/tts.ts` | TTS types (already canonical) |
| Move | `TTSHandler` from `types/common.ts` → `types/tts.ts` | Lives next to its data types |
| Create | `src/lib/types/stt.ts` | STT types: `STTOptions`, `STTResult`, `STTHandler`, `TranscriptionSegment`, `WordTiming`, `STTLanguage`, `STT_ERROR_CODES`, `STTQuality` |
| Create | `src/lib/types/realtime.ts` | Realtime types: `RealtimeConfig`, `RealtimeSession`, `RealtimeHandler`, `RealtimeAudioChunk`, `RealtimeMessage`, `RealtimeEventHandlers`, `REALTIME_ERROR_CODES`, `DEFAULT_REALTIME_CONFIG` |
| Delete | `src/lib/types/voice.ts` | All exports redistributed to `tts.ts`, `stt.ts`, `realtime.ts` |
| Update | `src/lib/types/index.ts` | Add `export * from "./stt.js"; export * from "./realtime.js";` |

**Resolution of duplicates:** Pick one variant per type. For `DeepgramSTTOptions`/`VoiceDeepgramSTTOptions` etc., keep the richer adapter version (it's more thorough). Merge missing fields from voice/provider versions.

**Naming:** All types globally unique per Rule 9. Adapter-specific options: `DeepgramSTTOptions`, `WhisperSTTOptions`, etc. (no `Voice*` prefix needed once duplicates removed).

---

### Phase 1 — TTS Provider Bridging

**Goal:** New TTS providers register with `TTSProcessor` and become available via `generate({ tts: ... })`.

**Files:**

| Action | File | Purpose |
|--------|------|---------|
| Move | `voice/providers/OpenAITTS.ts` → `adapters/tts/openaiTTSHandler.ts` | Match existing convention |
| Move | `voice/providers/ElevenLabsTTS.ts` → `adapters/tts/elevenLabsTTSHandler.ts` | Same |
| Move | `voice/providers/AzureTTS.ts` → `adapters/tts/azureTTSHandler.ts` | Same |
| Delete | `voice/providers/GoogleTTS.ts` | Duplicate of existing `googleTTSHandler.ts` |
| Refactor | All TTS handlers | Implement `TTSHandler` from `types/tts.ts` |
| Update | `factories/providerRegistry.ts` | Register all TTS handlers with TTSProcessor |

**Provider names registered:**

```typescript
TTSProcessor.registerHandler("google-ai", googleHandler);     // existing
TTSProcessor.registerHandler("vertex", googleHandler);        // existing
TTSProcessor.registerHandler("openai", openaiHandler);        // NEW
TTSProcessor.registerHandler("elevenlabs", elevenlabsHandler); // NEW
TTSProcessor.registerHandler("azure", azureHandler);          // NEW
```

**CLI updates (`commandFactory.ts`):**
- Add `--tts-provider` flag to override (e.g., `--provider vertex --tts-provider elevenlabs`)
- Update `TTSOptions` to add optional `provider?: string` field
- Update `BaseProvider.handleDirectTTSSynthesis` and `synthesizeAIResponseIfNeeded` to use `options.tts?.provider ?? options.provider`

**Streaming TTS:**
- Add `TTSProcessor.synthesizeStream(text, provider, options)` that yields `TTSChunk`
- Stream merges TTS chunks into `StreamChunk { type: "audio", audioChunk: TTSChunk }`

**Observability** (already covered by `TTSProcessor.synthesize`):
- Span: `tts.synthesize` with `SpanType.TTS`
- Attributes: `provider`, `text_length`, `voice`, `format`, `latency`

---

### Phase 2 — STT Processor (mirror TTSProcessor)

**Goal:** Create `STTProcessor` as the central STT orchestrator.

**Files:**

| Action | File | Purpose |
|--------|------|---------|
| Create | `src/lib/utils/sttProcessor.ts` | Mirror `ttsProcessor.ts`: static class, handler registry, observability |
| Merge | voice providers into adapter versions | Keep adapter versions, port missing features from voice providers |
| Delete | All `src/lib/voice/providers/*STT.ts` | After merge |
| Update | `factories/providerRegistry.ts` | Register STT handlers |
| Delete | `src/lib/voice/STTProvider.ts` | Replaced by `utils/sttProcessor.ts` |

**`STTProcessor` API:**

```typescript
export class STTProcessor {
  private static readonly handlers = new Map<string, STTHandler>();
  
  static registerHandler(providerName: string, handler: STTHandler): void;
  static supports(providerName: string): boolean;
  static async transcribe(audio: Buffer | ArrayBuffer, provider: string, options: STTOptions): Promise<STTResult>;
  static async *transcribeStream(audioStream: AsyncIterable<Buffer>, provider: string, options: STTOptions): AsyncIterable<TranscriptionSegment>;
}
```

**Observability:**
- Add `SpanType.STT` to `spanTypes.ts`
- Span: `stt.transcribe` with attributes: `provider`, `audio_size_bytes`, `format`, `language`, `confidence`, `duration`, `latency`
- Metrics: `recordSTTTranscription(provider, latency, audioSize, success)` in `metricsAggregator.ts`

**Integration into `BaseProvider`:**

```typescript
// In BaseProvider.generate():
if (options.stt?.enabled && options.input?.audio) {
  const transcription = await STTProcessor.transcribe(
    options.input.audio,
    options.stt.provider ?? options.provider ?? this.providerName,
    options.stt
  );
  options.prompt = options.prompt ?? transcription.text;
  enhancedResult.transcription = transcription;
}
```

**Type updates:**

```typescript
type TextGenerationOptions = {
  // existing...
  input?: { text?: string; audio?: Buffer | ArrayBuffer };
  stt?: STTOptions & { provider?: string };  // NEW
  tts?: TTSOptions & { provider?: string };
};

type EnhancedGenerateResult = {
  // existing...
  audio?: TTSResult;
  transcription?: STTResult;  // NEW
};
```

---

### Phase 3 — Realtime Processor (mirror pattern)

**Goal:** `RealtimeProcessor` becomes the single registry for bidirectional providers.

**Files:**

| Action | File | Purpose |
|--------|------|---------|
| Move | `voice/RealtimeVoiceAPI.ts` → `utils/realtimeProcessor.ts` | Match location pattern |
| Create | `adapters/realtime/` directory | New canonical home |
| Move | `voice/providers/OpenAIRealtime.ts` → `adapters/realtime/openaiRealtimeHandler.ts` | |
| Move | `voice/providers/GeminiLive.ts` → `adapters/realtime/geminiLiveHandler.ts` | |
| Update | `factories/providerRegistry.ts` | Register realtime handlers |

**SDK surface:**

```typescript
async startRealtimeSession(
  options: RealtimeConfig & { provider: string }
): Promise<RealtimeSession>
```

**Observability:**
- Add `SpanType.REALTIME` to `spanTypes.ts`
- Spans: `realtime.connect`, `realtime.audio.in`, `realtime.audio.out`, `realtime.turn`

---

### Phase 4 — SDK Surface Cleanup

**Goal:** Minimize SDK API. Delete parallel infrastructure.

**Files:**

| Action | File | Purpose |
|--------|------|---------|
| Update | `neurolink.ts` | Replace voice methods with minimal set (synthesize, transcribe, startRealtimeSession) |
| Delete | `voice/voiceAgent.ts` | Replaced by `generate({ stt, tts })` |
| Delete | `voice/compositeVoice.ts` | Replaced by Processors |
| Delete | `voice/voiceFactory.ts` | Replaced by Processors |
| Delete | `voice/voiceRegistry.ts` | Replaced by Processors |
| Delete | `voice/index.ts` | No longer needed |
| Move | `voice/audio-utils.ts` → `utils/audioUtils.ts` | General utility |
| Move | `voice/stream-handler.ts` → `utils/audioStreamHandler.ts` | General utility |
| Move | `voice/errors.ts` → `utils/voiceErrors.ts` | Error utilities |
| Delete | `src/lib/voice/` directory | After all moves |

**Final SDK voice surface (3 methods + options on existing):**

```typescript
class NeuroLink {
  // EXISTING (unchanged):
  async generate(options): Promise<EnhancedGenerateResult>
  async stream(options): Promise<StreamResult>
  
  // NEW thin wrappers:
  async transcribe(audio, options?): Promise<STTResult>
  async synthesize(text, options?): Promise<TTSResult>
  async startRealtimeSession(options): Promise<RealtimeSession>
}
```

---

### Phase 5 — CLI Cleanup

**Goal:** CLI follows SDK surface. Add `--stt*` flags symmetrically with `--tts*`.

**Files:**

| Action | File | Purpose |
|--------|------|---------|
| Delete | `cli/commands/voice.ts` | Use `generate` with flags instead |
| Update | `cli/parser.ts` | Remove `createVoiceCommands` import |
| Update | `cli/factories/commandFactory.ts` | Add `--stt*` flags |

**New CLI flags:**

```
--stt                    Enable STT
--stt-provider <name>    STT provider (whisper, deepgram, google, azure, assemblyai, gladia)
--stt-language <code>    Audio language code
--stt-format <fmt>       Audio input format
--stt-diarization        Enable speaker diarization
--stt-word-timestamps    Enable word-level timestamps
--input-audio <path>     Path to audio file for STT input
--tts-provider <name>    TTS provider (overrides --provider)
```

---

### Phase 6 — Voice Server Pluggability

**Goal:** Swap hardcoded Soniox/Cartesia for Processor calls.

**Files:**

| Action | File | Changes |
|--------|------|---------|
| Update | `server/voice/voiceWebSocketHandler.ts` | Replace Soniox WS with `STTProcessor.transcribeStream`; replace `CartesiaStream` with `TTSProcessor.synthesizeStream` |
| Refactor | `adapters/tts/cartesiaHandler.ts` | Register with `TTSProcessor` as `"cartesia"` |
| Create | `adapters/stt/sonioxSTTHandler.ts` | Wrap existing Soniox logic; register as `"soniox"` |
| Update | `server/voice/voiceServerApp.ts` | Read `VOICE_STT_PROVIDER` / `VOICE_TTS_PROVIDER` env vars |

**Backwards compatibility:** Default to Soniox + Cartesia (current behavior).

---

## 5. Observability Coverage

### New Span Types

```typescript
export enum SpanType {
  // existing...
  TTS = "tts",
  STT = "stt",          // NEW
  REALTIME = "realtime", // NEW
}
```

### Span Coverage Matrix

| Operation | Span Name | Type | Attributes |
|-----------|-----------|------|------------|
| TTS synthesis (existing) | `tts.synthesize` | TTS | provider, text_length, voice, format, latency |
| TTS streaming (new) | `tts.synthesizeStream` | TTS | provider, text_length, voice, format, chunks, total_latency |
| STT transcription | `stt.transcribe` | STT | provider, audio_size_bytes, format, language, latency, confidence, duration, word_count |
| STT streaming | `stt.transcribeStream` | STT | provider, format, language, segments, total_latency |
| Realtime connect | `realtime.connect` | REALTIME | provider, model, voice |
| Realtime audio in | `realtime.audio.in` | REALTIME | session_id, bytes |
| Realtime audio out | `realtime.audio.out` | REALTIME | session_id, bytes |
| Realtime turn | `realtime.turn` | REALTIME | session_id, duration_ms |

### Metrics Aggregator Additions

```typescript
recordSTTTranscription(provider, latency, audioSize, success): void
recordSTTStream(provider, latency, segments, success): void
recordTTSStream(provider, latency, chunks, totalSize, success): void
recordRealtimeSession(provider, durationMs, audioBytesIn, audioBytesOut): void
recordRealtimeTurn(provider, latencyMs): void
```

---

## 6. Test Suite Plan

### Existing — Extend

**`test/continuous-test-suite-tts.ts`:**
- Add tests for OpenAI, ElevenLabs, Azure TTS providers
- Add streaming TTS tests
- Add `--tts-provider` CLI flag tests
- Add cross-provider tests: provider=vertex, tts-provider=elevenlabs

### New Suites

**`test/continuous-test-suite-stt.ts`:**
- STTProcessor handler registration
- Per-provider transcription with sample WAV
- Format detection and validation
- Language code handling
- Word timestamps and diarization
- Streaming STT
- SDK integration: `generate({ input: { audio }, stt: { enabled: true } })`
- CLI flag tests: `--input-audio`, `--stt`, `--stt-provider`
- Error cases

**`test/continuous-test-suite-realtime.ts`:**
- RealtimeProcessor handler registration
- Session lifecycle
- Event handler registration and emission
- SDK integration: `neurolink.startRealtimeSession()`
- Error cases

**`test/continuous-test-suite-voice-server.ts`:**
- Voice server starts with default/custom providers
- WebSocket connection
- Health endpoint
- Frame bus pub/sub
- Turn manager state transitions

### Replace

**`test/continuous-test-suite-voice.ts`:**
- Becomes thin smoke test for all Processors
- Defers detailed coverage to specific suites

---

## 7. PR Strategy

| PR | Phase | Scope | Risk |
|----|-------|-------|------|
| #1 | Phase 0 | Type consolidation in `types/` | Low |
| #2 | Phase 1 | Register new TTS providers + `--tts-provider` flag | Low |
| #3 | Phase 2 | STTProcessor + STT integration into generate | Medium |
| #4 | Phase 3 | RealtimeProcessor + `startRealtimeSession` | Medium |
| #5 | Phase 4+5 | SDK + CLI cleanup, delete `src/lib/voice/` | Low |
| #6 | Phase 6 | Voice server pluggability | Low |

---

## 8. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| TTSProcessor registration changes break existing Google flow | Keep existing registration line untouched; new registrations only add |
| Different providers have different `TTSResult.format` defaults | Normalize in `TTSProcessor.synthesize` |
| Voice server regression | Default env values preserve current behavior |
| STT option fragmentation | Use `STTOptions` for common + `providerOptions?: unknown` for specific |
| Streaming TTS chunking inconsistency | All `synthesizeStream` yield `TTSChunk` with consistent shape |

---

## 9. Documentation Updates

| File | Update |
|------|--------|
| `docs/features/tts.md` | Add new providers + `--tts-provider` flag |
| `docs/features/stt.md` (NEW) | Providers, options, examples for SDK + CLI |
| `docs/features/realtime-voice.md` (NEW) | OpenAI Realtime + Gemini Live usage |
| `docs/features/voice-agent.md` | Replace with `generate({ stt, tts })` examples |
| `docs/real-time-speech-agents.md` | Mark proposal as implemented |
