# Voice/Speech Integration Cleanup Plan

**Branch:** `feat/voice-speech-integration`
**Date:** 2026-04-26
**Status:** Approved, executing

---

## Problem Statement

The voice/speech integration was built without properly understanding the existing system. The result is:

1. **Unnecessary SDK methods** (`synthesize()`, `transcribe()`, `startRealtimeVoice()`) that bypass NeuroLink's core pattern of `generate()` + `stream()` with JSON options
2. **Duplicate implementations** (two `STTProcessor` classes, two `GoogleTTS` implementations, two STT interface hierarchies)
3. **Dead code** (6 adapter/stt files implementing wrong interface, 13 zombie tracked files, zombie types)
4. **Missing production hardening** (no fetch timeouts on new providers)
5. **Stale documentation** (planned features shown as planned when they're implemented)
6. **Fake test suite** (tests standalone methods instead of consumer-facing generate/stream/CLI)

## What Already Exists on `origin/release`

| Component | Location | Status |
|-----------|----------|--------|
| `TTSProcessor` | `src/lib/utils/ttsProcessor.ts` | Shipped, static handler registry |
| `GoogleTTSHandler` | `src/lib/adapters/tts/googleTTSHandler.ts` | Shipped, Google Cloud TTS with gRPC SDK |
| `CartesiaHandler` | `src/lib/adapters/tts/cartesiaHandler.ts` | Shipped, WebSocket streaming for voice server |
| `generate({ tts })` | `src/lib/core/baseProvider.ts` | Shipped, Mode 1 (direct) + Mode 2 (AI response) |
| CLI `--tts*` flags | `src/cli/factories/commandFactory.ts` | Shipped |
| Voice server | `src/lib/server/voice/` + `src/cli/commands/voiceServer.ts` | Shipped, Cobra+Soniox+Cartesia real-time loop |
| Gemini Live audio | Google AI provider's stream path | Shipped |
| `TTSHandler` type | `src/lib/types/common.ts` | Shipped |
| TTS types | `src/lib/types/tts.ts` | Shipped |

## What This Branch Should Deliver

### New Capabilities

1. **STT via `generate()` and `stream()`** — `generate({ stt: { enabled: true, audio: buffer, provider: "google-stt" } })` → transcribes audio, uses transcription as LLM prompt, returns `result.transcription`
2. **New TTS providers** — OpenAI TTS, ElevenLabs, Azure TTS — usable via `generate({ tts: { enabled: true, provider: "openai-tts" } })`
3. **New STT providers** — Whisper (OpenAI), Google STT, Deepgram, Azure STT
4. **Realtime providers** — OpenAI Realtime, Gemini Live handlers (registered for future use)
5. **CLI `--stt` flags** — `--stt --stt-provider --input-audio --stt-language`
6. **Audio utilities** — format detection, WAV creation, PCM manipulation, chunked streaming
7. **STTProcessor** — mirrors TTSProcessor, central STT orchestrator with observability

### New Supporting Infrastructure

- `src/lib/utils/sttProcessor.ts` — static handler registry (mirrors TTSProcessor)
- `src/lib/voice/providers/` — 4 STT + 3 TTS + 2 Realtime provider implementations
- `src/lib/voice/audio-utils.ts` — audio format utilities
- `src/lib/voice/stream-handler.ts` — chunked audio streaming
- `src/lib/voice/errors.ts` — VoiceError, STTError, RealtimeError
- `src/lib/voice/RealtimeVoiceAPI.ts` — RealtimeProcessor + BaseRealtimeHandler
- `src/lib/types/stt.ts`, `realtime.ts`, `voice.ts` — type system

---

## Execution Plan

### Phase 1: Delete Dead Code

**Files to delete from disk:**

| File | Why |
|------|-----|
| `src/lib/adapters/stt/assemblyaiSTTHandler.ts` | Implements `STTProvider` (wrong interface), never registered |
| `src/lib/adapters/stt/azureSTTHandler.ts` | Same |
| `src/lib/adapters/stt/deepgramSTTHandler.ts` | Same |
| `src/lib/adapters/stt/gladiaSTTHandler.ts` | Same |
| `src/lib/adapters/stt/googleSTTHandler.ts` | Same |
| `src/lib/adapters/stt/whisperSTTHandler.ts` | Same |
| `src/lib/voice/providers/GoogleTTS.ts` | Duplicates existing `adapters/tts/googleTTSHandler.ts` |
| `src/lib/voice/STTProvider.ts` | Duplicate STTProcessor with empty Map at runtime |

**Files to `git rm` (tracked but deleted from disk — zombie files):**

| File | Why |
|------|-----|
| `src/lib/voice/voiceFactory.ts` | Deleted earlier, still in git index |
| `src/lib/voice/voiceRegistry.ts` | Same |
| `src/lib/voice/compositeVoice.ts` | Same |
| `src/lib/voice/voiceAgent.ts` | Same |
| `src/cli/commands/voice.ts` | Same |
| `src/lib/types/ttsTypes.ts` | Renamed to `tts.ts`, zombie in index |
| `src/lib/voice/types/voiceTypes.ts` | Moved to `src/lib/types/`, zombie |
| `test/voice/RealtimeVoiceAPI.test.ts` | Deleted, zombie |
| `test/voice/STTProvider.test.ts` | Same |
| `test/voice/VoiceFactory.test.ts` | Same |
| `test/voice/VoiceRegistry.test.ts` | Same |
| `test/voice/audio-utils.test.ts` | Same |
| `test/voice/integration.test.ts` | Same |
| `test/voice/integration/voice.integration.test.ts` | Same |

### Phase 2: Remove Unnecessary SDK Methods from `neurolink.ts`

Remove these methods from the `NeuroLink` class (lines ~11980-12058):
- `synthesize(text, options?)` — `generate({ tts: { enabled: true } })` already does this
- `transcribe(audio, options?)` — `generate({ stt: { enabled: true, audio } })` already does this
- `startRealtimeVoice(config, provider?)` — realtime voice is CLI-only via `voice-server`

Remove corresponding imports that become unused after method removal.

**Keep intact:**
- STT preprocessing in `runStandardGenerateRequest()` (the `stt` option flow)
- `stt` forwarding in `buildGenerateTextOptions()`
- `transcription` in `finalizeGenerateRequestResult()`
- All TTS integration in `baseProvider.ts` (untouched)

### Phase 3: Clean Types

**`src/lib/types/voice.ts` — remove zombie types:**
- `CompositeVoiceConfig` — for deleted compositeVoice.ts
- `CompositeVoiceSession` — same
- `VoiceAgentConfig` — for deleted voiceAgent.ts
- `VoiceProcessingResult` — same
- `VoiceAgentEvent` — same
- `VoiceAgentEventData` — same
- `VoiceProviderEntry` — for deleted voiceRegistry.ts
- `VoiceProviderMetadata` — same
- `VoiceProvider` (the full interface with `getCapabilities`, `validateConfig`) — only used by dead adapter layer

**`src/lib/types/stt.ts` — remove dead types:**
- `STTProvider` type — only implemented by deleted adapter files
- `AssemblyAISTTOptions` — only used by deleted assemblyaiSTTHandler
- `GladiaSTTOptions` — only used by deleted gladiaSTTHandler
- All AssemblyAI/Gladia response types (`AssemblyAITranscriptResponse`, `AssemblyAIUploadResponse`, `GladiaUploadResponse`, `GladiaTranscriptionResponse`, `GladiaResultResponse`, `GladiaTranscriptionResult`)
- Keep: `WhisperSTTOptions`, `DeepgramSTTOptions`, `AzureSTTOptions`, `GoogleSTTOptions` (used by live providers)
- Keep: `WhisperVerboseResponse`, `DeepgramResponse`, `AzureRecognitionResult`, `GoogleRecognizeResponse` etc. (used by live providers)

**`src/lib/types/index.ts` — fix double-export:**
- Currently exports `tts.js`, `stt.js`, `realtime.js` directly AND via `voice.js` (which re-exports them)
- Remove the direct exports; keep only `export * from "./voice.js"` (which re-exports all three)

### Phase 4: Clean `voice/index.ts` Barrel

Remove exports for deleted files:
- Remove `STTProcessor` re-export from `./STTProvider.js` (deleted)
- Remove `GoogleTTS` export from `./providers/GoogleTTS.js` (deleted)
- Remove any references to voiceFactory, voiceRegistry, compositeVoice, voiceAgent
- Keep all other exports (live providers, audio-utils, stream-handler, errors, RealtimeProcessor)

### Phase 5: Add Fetch Timeouts to Providers

Add `AbortController` + 30-second timeout to all `fetch()` calls in:
- `src/lib/voice/providers/OpenAITTS.ts`
- `src/lib/voice/providers/ElevenLabsTTS.ts`
- `src/lib/voice/providers/AzureTTS.ts`
- `src/lib/voice/providers/OpenAISTT.ts`
- `src/lib/voice/providers/DeepgramSTT.ts`
- `src/lib/voice/providers/GoogleSTT.ts`
- `src/lib/voice/providers/AzureSTT.ts`

Pattern:
```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000);
try {
  const response = await fetch(url, { ...options, signal: controller.signal });
  // ...
} finally {
  clearTimeout(timeoutId);
}
```

### Phase 6: Rewrite Test Suite

`test/continuous-test-suite-voice.ts` — test ONLY through consumer APIs (`generate()`, `stream()`, CLI):

| # | Test | What It Proves |
|---|------|---------------|
| 1 | `generate({ tts: { enabled: true } })` → content + audio MP3 | Existing TTS pipeline works |
| 2 | `generate({ tts: { enabled: true, format: "wav" } })` → RIFF header | WAV format works |
| 3 | `generate({ tts: { enabled: true, provider: "elevenlabs" } })` → correct error | Unconfigured provider error |
| 4 | `generate({ stt: { enabled: true, audio: wav, provider: "google-stt" } })` → transcription + content | STT→LLM pipeline (core new feature) |
| 5 | `generate({ stt: { enabled: true, audio: empty } })` → correct error | Empty audio guard |
| 6 | `generate({ stt + tts both })` → transcription + content + audio | Full round-trip |
| 7 | `stream({ tts: { enabled: true } })` → chunks | Streaming + TTS |
| 8 | CLI `--tts --tts-output` → audio file on disk | CLI TTS |
| 9 | CLI `--stt --stt-provider --input-audio` → output | CLI STT |
| 10 | Handler registration (5 TTS + 5 STT + 2 Realtime) | providerRegistry wires all handlers |
| 11 | Audio utils (detectFormat, createWavHeader, splitIntoChunks guards) | Utilities work |
| 12 | ChunkedAudioStream (sampleRate=0 throws, etc.) | Stream handler safety |
| 13 | Barrel exports (STT_ERROR_CODES, SpanType.STT, AUDIO_FORMAT_DETAILS) | Types exported |
| 14 | `sdk.synthesize` does NOT exist, `sdk.transcribe` does NOT exist | Removed methods confirmed gone |
| 15 | Audio file save + read-back | File I/O round-trip |

### Phase 7: Update Documentation

**`docs/features/audio-input.md`:**
- Move `sdk.transcribe()` from "Planned" → clarify: STT is available via `generate({ stt: ... })`
- Move Whisper, Google STT from "Planned" → "Available"
- Add Deepgram, Azure STT to provider matrix as "Available"
- Add usage examples for `generate({ stt: ... })` and CLI `--stt`
- Update provider support matrix

**`docs/features/tts.md`:**
- Add OpenAI TTS, ElevenLabs, Azure TTS to "Supported Providers" (no longer "Planned")
- Add `--tts-provider` CLI flag to docs
- Add provider-specific env var requirements

---

## Parallel Execution Map

```
Agent 1: File Deletion + Git Cleanup
  ├── Delete 8 files from disk
  ├── git rm 14 zombie files
  └── Touches: filesystem only, no source edits

Agent 2: neurolink.ts Method Removal
  ├── Remove synthesize(), transcribe(), startRealtimeVoice()
  ├── Remove unused imports
  └── Touches: src/lib/neurolink.ts ONLY

Agent 3: Types Cleanup
  ├── Clean voice.ts (remove zombie types)
  ├── Clean stt.ts (remove dead STTProvider + adapter types)
  ├── Fix index.ts double-export
  └── Touches: src/lib/types/voice.ts, stt.ts, index.ts

Agent 4: voice/index.ts Barrel Cleanup
  ├── Remove exports for deleted files
  ├── Remove STTProcessor from STTProvider
  └── Touches: src/lib/voice/index.ts ONLY

Agent 5: Provider Timeouts
  ├── Add AbortController + 30s timeout to all fetch() calls
  └── Touches: 7 provider files in src/lib/voice/providers/

Agent 6: Test Suite Rewrite
  ├── Rewrite continuous-test-suite-voice.ts
  ├── Test through generate()/stream()/CLI only
  └── Touches: test/continuous-test-suite-voice.ts ONLY

Agent 7: Documentation Updates
  ├── Update audio-input.md
  ├── Update tts.md
  └── Touches: docs/ ONLY

All 7 agents touch DIFFERENT files — full parallel execution.
```

## Post-Execution Verification

After all agents complete:
1. `pnpm run build` — must succeed
2. `pnpm run lint` — must pass
3. `pnpm run check` — must pass
4. `npx tsx test/continuous-test-suite-voice.ts --provider=vertex` — all tests pass
5. Squash into single commit
