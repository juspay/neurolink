# Voice and Speech Integration Implementation Plan

## Document Information

| Field                  | Value                                                                 |
| ---------------------- | --------------------------------------------------------------------- |
| Feature                | Voice and Speech Integration (TTS, STT, Realtime Voice)               |
| Reference Document     | `/docs/mastra-features-implementation/08-voice-speech-integration.md` |
| Status                 | Planning                                                              |
| Estimated Total Effort | 10-12 weeks                                                           |
| Priority               | Medium-High                                                           |

---

## Executive Summary

This implementation plan details the phased approach to adding comprehensive voice capabilities to NeuroLink, following Mastra-style patterns. The implementation builds on NeuroLink's existing TTS foundation (`TTSProcessor`, `GoogleTTSHandler`) and extends it to support multiple TTS providers, Speech-to-Text (STT) providers, Realtime Voice APIs, and a unified Voice Agent integration.

**Key Research Insights (January 2026):**

- **The 300ms Rule**: Response latency exceeding 300ms causes unnatural conversation flow; >800ms causes 40% higher abandonment
- **Best-in-class latencies**: STT ~100ms (Deepgram), TTS ~75ms (ElevenLabs Flash), achievable voice-to-voice ~510ms
- **WebRTC dominance**: WebRTC has become the standard transport for real-time voice AI applications
- **Market growth**: Voice AI market projected $47.5 billion by 2034 (34.8% CAGR)

---

## Table of Contents

1. [Prerequisites and Dependencies](#1-prerequisites-and-dependencies)
2. [Phase 1: Voice Provider Interface and Foundation](#2-phase-1-voice-provider-interface-and-foundation)
3. [Phase 2: TTS Provider Implementation](#3-phase-2-tts-provider-implementation)
4. [Phase 3: STT Provider Implementation](#4-phase-3-stt-provider-implementation)
5. [Phase 4: Realtime Voice (WebRTC/WebSocket)](#5-phase-4-realtime-voice-webrtcwebsocket)
6. [Phase 5: Voice Agent Integration](#6-phase-5-voice-agent-integration)
7. [Phase 6: Audio Processing Utilities](#7-phase-6-audio-processing-utilities)
8. [Phase 7: Testing and Documentation](#8-phase-7-testing-and-documentation)
9. [Effort Summary by Phase](#9-effort-summary-by-phase)
10. [Browser and Node.js Compatibility Matrix](#10-browser-and-nodejs-compatibility-matrix)
11. [Risk Assessment and Mitigation](#11-risk-assessment-and-mitigation)
12. [Success Criteria](#12-success-criteria)
13. [Voice Provider Benchmarks](#13-voice-provider-benchmarks) (NEW)
14. [The 300ms Rule](#14-the-300ms-rule) (NEW)
15. [WebRTC Architecture Patterns](#15-webrtc-architecture-patterns) (NEW)
16. [Updated Provider Priority](#16-updated-provider-priority) (NEW)
17. [Production Voice Stack](#17-production-voice-stack) (NEW)
18. [Appendix](#18-appendix)

---

## 1. Prerequisites and Dependencies

### 1.1 Existing Infrastructure (Already Available)

| Component                 | Location                                   | Status      |
| ------------------------- | ------------------------------------------ | ----------- |
| TTSProcessor              | `src/lib/utils/ttsProcessor.ts`            | Implemented |
| TTSHandler Interface      | `src/lib/utils/ttsProcessor.ts`            | Implemented |
| GoogleTTSHandler          | `src/lib/adapters/tts/googleTTSHandler.ts` | Implemented |
| TTS Types                 | `src/lib/types/ttsTypes.ts`                | Implemented |
| TTSError                  | `src/lib/utils/ttsProcessor.ts`            | Implemented |
| Error Handling Patterns   | `src/lib/utils/errorHandling.ts`           | Implemented |
| Provider Factory Pattern  | `src/lib/factories/providerFactory.ts`     | Implemented |
| Provider Registry Pattern | `src/lib/factories/providerRegistry.ts`    | Implemented |

### 1.2 Required New Dependencies

| Package         | Purpose                                        | Version | Phase   |
| --------------- | ---------------------------------------------- | ------- | ------- |
| `@deepgram/sdk` | Deepgram STT API (P0 - best streaming latency) | `^3.x`  | Phase 3 |
| `ws`            | WebSocket for Node.js (Realtime)               | `^8.x`  | Phase 4 |
| `@types/ws`     | TypeScript types for ws                        | `^8.x`  | Phase 4 |
| `assemblyai`    | AssemblyAI STT API (P1 - cost-effective)       | `^4.x`  | Phase 3 |

### 1.3 Optional Dependencies (Provider-Specific)

| Package                               | Purpose                            | When Needed                           |
| ------------------------------------- | ---------------------------------- | ------------------------------------- |
| `@azure/cognitiveservices-speech-sdk` | Azure Speech Services              | If Azure TTS/STT native SDK preferred |
| `elevenlabs`                          | ElevenLabs official SDK (P0)       | Alternative to REST API               |
| `@cartesia/cartesia-js`               | Cartesia TTS (P1 - lowest latency) | For ultra-low latency requirements    |
| `playht`                              | PlayHT TTS                         | For voice cloning features            |

### 1.4 Environment Variables Required

```bash
# TTS Providers
ELEVENLABS_API_KEY=           # ElevenLabs TTS
OPENAI_API_KEY=               # OpenAI TTS + Whisper STT + Realtime
AZURE_SPEECH_KEY=             # Azure Speech Services
AZURE_SPEECH_REGION=          # Azure region (e.g., eastus)
SARVAM_API_KEY=               # Sarvam AI (Indian languages)
MURF_API_KEY=                 # Murf.ai TTS
PLAYAI_API_KEY=               # Play.ai TTS
SPEECHIFY_API_KEY=            # Speechify TTS

# STT Providers
DEEPGRAM_API_KEY=             # Deepgram STT
GLADIA_API_KEY=               # Gladia STT

# Existing (already documented)
GOOGLE_APPLICATION_CREDENTIALS=  # Google Cloud TTS
```

---

## 2. Phase 1: Voice Provider Interface and Foundation

### 2.1 Objectives

- Establish the voice module directory structure
- Create core type definitions for STT and Realtime
- Implement unified voice provider interface
- Create voice-specific error handling

### 2.2 Directory Structure to Create

```
src/lib/
├── voice/                              # NEW: Voice module
│   ├── index.ts                        # Voice module exports
│   ├── voiceProviderInterface.ts       # Abstract voice interface
│   ├── voiceFactory.ts                 # Voice provider factory
│   ├── voiceRegistry.ts                # Voice provider registration
│   ├── compositeVoice.ts               # Combined TTS + STT
│   └── errors.ts                       # Voice-specific errors
│
├── adapters/
│   ├── tts/                            # EXISTING: Extend
│   │   └── (existing googleTTSHandler.ts)
│   │
│   ├── stt/                            # NEW: STT adapters
│   │   └── (to be created)
│   │
│   └── realtime/                       # NEW: Realtime adapters
│       └── (to be created)
│
└── types/
    ├── ttsTypes.ts                     # EXISTING: Already complete
    ├── sttTypes.ts                     # NEW: STT types
    ├── realtimeTypes.ts                # NEW: Realtime types
    └── voiceTypes.ts                   # NEW: Unified voice types
```

### 2.3 Tasks

| Task ID | Task                                                | Priority | Effort | Dependencies |
| ------- | --------------------------------------------------- | -------- | ------ | ------------ |
| P1-01   | Create voice module directory structure             | High     | 0.5d   | None         |
| P1-02   | Implement `src/lib/types/sttTypes.ts`               | High     | 1d     | None         |
| P1-03   | Implement `src/lib/types/realtimeTypes.ts`          | High     | 1d     | None         |
| P1-04   | Implement `src/lib/types/voiceTypes.ts`             | High     | 0.5d   | P1-02, P1-03 |
| P1-05   | Implement `src/lib/voice/errors.ts`                 | High     | 1d     | None         |
| P1-06   | Implement `src/lib/voice/voiceProviderInterface.ts` | High     | 1.5d   | P1-02, P1-03 |
| P1-07   | Implement `src/lib/voice/voiceFactory.ts`           | High     | 1d     | P1-06        |
| P1-08   | Implement `src/lib/voice/voiceRegistry.ts`          | Medium   | 1d     | P1-07        |
| P1-09   | Create `src/lib/voice/index.ts` exports             | Low      | 0.5d   | All above    |
| P1-10   | Unit tests for voice foundation                     | High     | 1.5d   | All above    |

### 2.4 Key Interfaces to Implement

```typescript
// src/lib/voice/voiceProviderInterface.ts

export type VoiceCapability = "tts" | "stt" | "realtime" | "streaming";

export type VoiceProviderConfig = {
  name: string;
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
  options?: Record<string, unknown>;
};

export type VoiceProvider = {
  readonly name: string;
  getCapabilities(): VoiceCapability[];
  isConfigured(): boolean;
  validateConfig(): Promise<{ valid: boolean; errors: string[] }>;
  getOptionsSchema?(): Record<string, unknown>;
};

export type TTSProvider = VoiceProvider & {
  synthesize(text: string, options: TTSOptions): Promise<TTSResult>;
  synthesizeStream?(
    text: string,
    options: TTSOptions,
  ): AsyncIterable<TTSStreamChunk>;
  getVoices(languageCode?: string): Promise<TTSVoice[]>;
  readonly maxTextLength: number;
};

export type STTProvider = VoiceProvider & {
  transcribe(
    audio: Buffer | ArrayBuffer,
    options: STTOptions,
  ): Promise<STTResult>;
  transcribeStream?(
    audioStream: AsyncIterable<Buffer>,
    options: STTOptions,
  ): AsyncIterable<TranscriptionSegment>;
  getSupportedLanguages(): Promise<string[]>;
  getSupportedFormats(): string[];
};

export type RealtimeVoiceProvider = VoiceProvider & {
  connect(config: RealtimeConfig): Promise<RealtimeSession>;
  isConnected(): boolean;
  disconnect(): Promise<void>;
  getSessionConfig(): RealtimeConfig | null;
};
```

### 2.5 Browser vs Node.js Considerations

| Feature              | Node.js            | Browser            | Notes                     |
| -------------------- | ------------------ | ------------------ | ------------------------- |
| File Buffer handling | Native `Buffer`    | `ArrayBuffer`      | Use type union            |
| WebSocket            | `ws` package       | Native `WebSocket` | Abstract behind interface |
| FormData             | `undici` or native | Native             | Use native `FormData`     |
| Audio playback       | N/A                | Web Audio API      | Optional utility          |

### 2.6 Estimated Effort: 10 working days

---

## 3. Phase 2: TTS Provider Implementation

### 3.1 Objectives

- Implement TTS handlers for all target providers
- Ensure consistent interface across providers
- Support streaming synthesis where available
- Implement voice discovery for each provider

### 3.2 Provider Priority and Features

| Provider     | Priority | Streaming | Voice Discovery | Max Text Length |
| ------------ | -------- | --------- | --------------- | --------------- |
| ElevenLabs   | P0       | Yes       | API             | 5,000 chars     |
| OpenAI TTS   | P0       | No        | Static          | 4,096 chars     |
| Azure Speech | P1       | Yes       | API             | 10,000 chars    |
| Sarvam       | P1       | No        | Static          | 3,000 chars     |
| Murf         | P2       | Yes       | API             | TBD             |
| Play.ai      | P2       | Yes       | API             | TBD             |
| Speechify    | P2       | No        | API             | TBD             |

### 3.3 Tasks

| Task ID | Task                                       | Priority | Effort | Dependencies |
| ------- | ------------------------------------------ | -------- | ------ | ------------ |
| P2-01   | Implement `elevenLabsTTSHandler.ts`        | P0       | 2d     | Phase 1      |
| P2-02   | Implement ElevenLabs streaming             | P0       | 1d     | P2-01        |
| P2-03   | Implement `openaiTTSHandler.ts`            | P0       | 1.5d   | Phase 1      |
| P2-04   | Implement `azureTTSHandler.ts`             | P1       | 2d     | Phase 1      |
| P2-05   | Implement Azure SSML support               | P1       | 1d     | P2-04        |
| P2-06   | Implement `sarvamTTSHandler.ts`            | P1       | 1.5d   | Phase 1      |
| P2-07   | Implement `murfTTSHandler.ts`              | P2       | 1d     | Phase 1      |
| P2-08   | Implement `playaiTTSHandler.ts`            | P2       | 1d     | Phase 1      |
| P2-09   | Implement `speechifyTTSHandler.ts`         | P2       | 1d     | Phase 1      |
| P2-10   | Register all TTS handlers in VoiceRegistry | High     | 0.5d   | All above    |
| P2-11   | Unit tests for each TTS handler            | High     | 2d     | All above    |
| P2-12   | Integration tests (requires API keys)      | Medium   | 1d     | P2-11        |

### 3.4 Implementation Pattern (ElevenLabs Example)

```typescript
// src/lib/adapters/tts/elevenLabsTTSHandler.ts

export class ElevenLabsTTSHandler implements TTSHandler {
  private readonly apiKey: string | null;
  private readonly baseUrl = "https://api.elevenlabs.io/v1";
  private voicesCache: { voices: TTSVoice[]; timestamp: number } | null = null;
  private static readonly CACHE_TTL_MS = 5 * 60 * 1000;
  public readonly maxTextLength = 5000;

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env.ELEVENLABS_API_KEY ?? null;
  }

  isConfigured(): boolean {
    return this.apiKey !== null;
  }

  async getVoices(languageCode?: string): Promise<TTSVoice[]> {
    // Implementation with caching
  }

  async synthesize(text: string, options: TTSOptions): Promise<TTSResult> {
    // REST API implementation
  }

  async *synthesizeStream(
    text: string,
    options: TTSOptions,
  ): AsyncIterable<TTSStreamChunk> {
    // Streaming implementation
  }
}
```

### 3.5 Estimated Effort: 15 working days

---

## 4. Phase 3: STT Provider Implementation

### 4.1 Objectives

- Implement STT handlers for Deepgram, Whisper, and Gladia
- Support both batch and streaming transcription
- Implement speaker diarization where available
- Handle multiple audio formats

### 4.2 Provider Priority and Features

| Provider         | Priority | Streaming | Diarization | Word Timestamps | Languages |
| ---------------- | -------- | --------- | ----------- | --------------- | --------- |
| Deepgram         | P0       | Yes       | Yes         | Yes             | 36+       |
| Whisper (OpenAI) | P0       | No        | No          | Yes             | 97+       |
| Gladia           | P1       | Yes       | Yes         | Yes             | 99+       |

### 4.3 Tasks

| Task ID | Task                                               | Priority | Effort | Dependencies |
| ------- | -------------------------------------------------- | -------- | ------ | ------------ |
| P3-01   | Implement `deepgramSTTHandler.ts`                  | P0       | 2.5d   | Phase 1      |
| P3-02   | Implement Deepgram WebSocket streaming             | P0       | 2d     | P3-01        |
| P3-03   | Implement Deepgram speaker diarization             | P0       | 1d     | P3-01        |
| P3-04   | Implement `whisperSTTHandler.ts`                   | P0       | 2d     | Phase 1      |
| P3-05   | Implement Whisper word timestamps                  | P0       | 0.5d   | P3-04        |
| P3-06   | Implement `gladiaSTTHandler.ts`                    | P1       | 2d     | Phase 1      |
| P3-07   | Implement Gladia streaming                         | P1       | 1.5d   | P3-06        |
| P3-08   | Register all STT handlers in VoiceRegistry         | High     | 0.5d   | All above    |
| P3-09   | Unit tests for each STT handler                    | High     | 2d     | All above    |
| P3-10   | Integration tests (requires API keys + test audio) | Medium   | 1.5d   | P3-09        |

### 4.4 STT Types Definition

```typescript
// src/lib/types/sttTypes.ts

export type STTOptions = {
  language?: string;
  format?: STTAudioFormat;
  diarization?: boolean;
  speakerCount?: number;
  wordTimestamps?: boolean;
  punctuate?: boolean;
  keywords?: string[];
  model?: string;
  profanityFilter?: boolean;
  providerOptions?: Record<string, unknown>;
};

export type STTResult = {
  text: string;
  language: string;
  segments: TranscriptionSegment[];
  duration: number;
  confidence: number;
  metadata: {
    latency: number;
    provider: string;
    model?: string;
    speakerCount?: number;
    [key: string]: unknown;
  };
};

export type TranscriptionSegment = {
  text: string;
  start: number;
  end: number;
  confidence: number;
  speaker?: string;
  words?: TranscriptionWord[];
  isFinal?: boolean;
};
```

### 4.5 Estimated Effort: 14 working days

---

## 5. Phase 4: Realtime Voice (WebRTC/WebSocket)

### 5.1 Objectives

- Implement OpenAI Realtime API handler
- Extract and refactor Gemini Live handler from existing code
- Create unified realtime session interface
- Support bidirectional audio streaming

### 5.2 Provider Comparison

| Provider        | Connection | Audio Format | Turn Detection | Function Calling |
| --------------- | ---------- | ------------ | -------------- | ---------------- |
| OpenAI Realtime | WebSocket  | PCM16/G.711  | Server VAD     | Yes              |
| Gemini Live     | WebSocket  | PCM16        | Server VAD     | Yes              |

### 5.3 Tasks

| Task ID | Task                                                  | Priority | Effort | Dependencies |
| ------- | ----------------------------------------------------- | -------- | ------ | ------------ |
| P4-01   | Define realtime types and interfaces                  | High     | 1d     | Phase 1      |
| P4-02   | Implement WebSocket abstraction layer                 | High     | 1.5d   | P4-01        |
| P4-03   | Implement `openaiRealtimeHandler.ts`                  | P0       | 3d     | P4-02        |
| P4-04   | Implement OpenAI session management                   | P0       | 1.5d   | P4-03        |
| P4-05   | Implement OpenAI function calling support             | P0       | 1d     | P4-03        |
| P4-06   | Extract `geminiLiveHandler.ts` from googleAiStudio.ts | P1       | 2d     | P4-02        |
| P4-07   | Refactor Gemini Live to match interface               | P1       | 1.5d   | P4-06        |
| P4-08   | Browser WebSocket compatibility layer                 | Medium   | 1d     | P4-02        |
| P4-09   | Unit tests for realtime handlers                      | High     | 2d     | All above    |
| P4-10   | Manual integration tests                              | Medium   | 1d     | P4-09        |

### 5.4 Realtime Types Definition

```typescript
// src/lib/types/realtimeTypes.ts

export type RealtimeConfig = {
  model?: string;
  voice?: string;
  inputFormat?: {
    encoding: "pcm16" | "g711_ulaw" | "g711_alaw";
    sampleRate: number;
    channels: 1 | 2;
  };
  outputFormat?: {
    encoding: "pcm16" | "g711_ulaw" | "g711_alaw";
    sampleRate: number;
  };
  instructions?: string;
  turnDetection?: "server_vad" | "none";
  vadThreshold?: number;
  transcribeInput?: boolean;
  providerOptions?: Record<string, unknown>;
};

export type RealtimeSession = {
  id: string;
  sendAudio(audio: Buffer | ArrayBuffer): void;
  commitAudio(): void;
  clearAudio(): void;
  sendText(text: string): void;
  createResponse(): void;
  cancelResponse(): void;
  updateSession(config: Partial<RealtimeConfig>): void;
  on(event: RealtimeEventType, handler: (event: RealtimeEvent) => void): void;
  off(event: RealtimeEventType, handler: (event: RealtimeEvent) => void): void;
  close(): void;
  isOpen(): boolean;
};
```

### 5.5 Browser vs Node.js WebSocket

```typescript
// src/lib/voice/websocketAdapter.ts

export type WebSocketAdapter = {
  connect(url: string, headers?: Record<string, string>): Promise<void>;
  send(data: string | Buffer): void;
  on(
    event: "message" | "close" | "error",
    handler: (data: unknown) => void,
  ): void;
  close(): void;
  isOpen(): boolean;
};

// Node.js implementation uses 'ws' package
// Browser implementation uses native WebSocket
export function createWebSocketAdapter(): WebSocketAdapter {
  if (typeof window !== "undefined") {
    return new BrowserWebSocketAdapter();
  }
  return new NodeWebSocketAdapter();
}
```

### 5.6 Estimated Effort: 15 working days

---

## 6. Phase 5: Voice Agent Integration

### 6.1 Objectives

- Implement CompositeVoice class combining TTS + STT
- Create VoiceAgent class for NeuroLink integration
- Support both batch and realtime conversation modes
- Integrate with existing NeuroLink SDK

### 6.2 Tasks

| Task ID | Task                                       | Priority | Effort | Dependencies   |
| ------- | ------------------------------------------ | -------- | ------ | -------------- |
| P5-01   | Implement `compositeVoice.ts`              | High     | 2.5d   | Phases 2-3     |
| P5-02   | Implement conversation history             | High     | 0.5d   | P5-01          |
| P5-03   | Implement streaming listen/speak           | High     | 1.5d   | P5-01          |
| P5-04   | Implement `voiceAgent.ts`                  | High     | 2d     | P5-01          |
| P5-05   | Integrate VoiceAgent with NeuroLink        | High     | 1.5d   | P5-04          |
| P5-06   | Add realtime session support to VoiceAgent | High     | 1.5d   | Phase 4, P5-04 |
| P5-07   | Update NeuroLink SDK exports               | Medium   | 0.5d   | P5-05          |
| P5-08   | Unit tests for CompositeVoice              | High     | 1.5d   | P5-03          |
| P5-09   | Unit tests for VoiceAgent                  | High     | 1.5d   | P5-06          |
| P5-10   | Integration tests (full voice pipeline)    | Medium   | 2d     | All above      |

### 6.3 CompositeVoice API

```typescript
// src/lib/voice/compositeVoice.ts

export class CompositeVoice {
  constructor(config: CompositeVoiceConfig);

  // STT operations
  async listen(
    audio: Buffer | ArrayBuffer,
    options?: STTOptions,
  ): Promise<STTResult>;
  async *listenStream(
    audioStream: AsyncIterable<Buffer>,
    options?: STTOptions,
  ): AsyncIterable<TranscriptionSegment>;

  // TTS operations
  async speak(text: string, options?: TTSOptions): Promise<TTSResult>;
  async *speakStream(
    text: string,
    options?: TTSOptions,
  ): AsyncIterable<TTSStreamChunk>;

  // Full conversation turn
  async converse(
    userAudio: Buffer | ArrayBuffer,
    processor: (text: string) => Promise<string>,
    options?: { sttOptions?: STTOptions; ttsOptions?: TTSOptions },
  ): Promise<{
    userText: string;
    assistantText: string;
    assistantAudio: TTSResult;
    transcription: STTResult;
  }>;

  // Utilities
  getHistory(): VoiceTurn[];
  clearHistory(): void;
  async getVoices(languageCode?: string): Promise<TTSVoice[]>;
  async getLanguages(): Promise<string[]>;
  isFullyConfigured(): boolean;
}
```

### 6.4 VoiceAgent API

```typescript
// src/lib/voice/voiceAgent.ts

export class VoiceAgent {
  constructor(config: VoiceAgentConfig);

  // Batch voice processing (CompositeVoice mode)
  async processVoice(
    audio: Buffer | ArrayBuffer,
    options?: {
      generateOptions?: Partial<TextGenerationOptions>;
      ttsVoice?: string;
    },
  ): Promise<{
    userText: string;
    assistantText: string;
    audio: Buffer;
    metadata: {
      transcriptionTime: number;
      generationTime: number;
      synthesisTime: number;
      totalTime: number;
    };
  }>;

  // Realtime mode
  streamAudio(audio: Buffer | ArrayBuffer): void;
  sendText(text: string): void;
  commitAndRespond(): void;
  onAudioResponse(handler: (audio: Buffer) => void): void;
  onTextResponse(handler: (text: string) => void): void;

  // Session management
  getHistory(): Array<{ role: string; content: string }>;
  clearHistory(): void;
  async close(): Promise<void>;
}
```

### 6.5 Estimated Effort: 15 working days

---

## 7. Phase 6: Audio Processing Utilities

### 7.1 Objectives

- Create audio format conversion utilities
- Implement audio chunking for streaming
- Add audio validation helpers
- Create playback utilities (browser-specific)

### 7.2 Tasks

| Task ID | Task                                   | Priority | Effort | Dependencies |
| ------- | -------------------------------------- | -------- | ------ | ------------ |
| P6-01   | Create `audioUtils.ts`                 | High     | 1.5d   | None         |
| P6-02   | Implement PCM16 conversion             | High     | 1d     | P6-01        |
| P6-03   | Implement audio chunking for streaming | High     | 1d     | P6-01        |
| P6-04   | Implement audio format detection       | Medium   | 0.5d   | P6-01        |
| P6-05   | Implement audio validation             | Medium   | 0.5d   | P6-01        |
| P6-06   | Create browser audio playback utility  | Low      | 1d     | P6-01        |
| P6-07   | Create Node.js audio save utility      | Low      | 0.5d   | P6-01        |
| P6-08   | Unit tests for audio utilities         | High     | 1d     | All above    |

### 7.3 Audio Utilities API

```typescript
// src/lib/voice/audioUtils.ts

export class AudioUtils {
  // Format conversion
  static bufferToArrayBuffer(buffer: Buffer): ArrayBuffer;
  static arrayBufferToBuffer(arrayBuffer: ArrayBuffer): Buffer;
  static base64ToBuffer(base64: string): Buffer;
  static bufferToBase64(buffer: Buffer): string;

  // PCM conversion
  static toPCM16(
    audio: Buffer,
    inputFormat: AudioFormat,
    sampleRate: number,
  ): Buffer;
  static fromPCM16(pcm16: Buffer, outputFormat: AudioFormat): Buffer;

  // Chunking
  static chunkAudio(audio: Buffer, chunkSize: number): Buffer[];
  static async *streamChunks(
    audio: Buffer,
    chunkSize: number,
    delayMs?: number,
  ): AsyncIterable<Buffer>;

  // Validation
  static detectFormat(audio: Buffer): AudioFormat | null;
  static isValidAudioBuffer(audio: Buffer | ArrayBuffer): boolean;
  static getAudioDuration(
    audio: Buffer,
    format: AudioFormat,
    sampleRate: number,
  ): number;

  // Browser playback (conditional import)
  static async playInBrowser(audio: Buffer, format: AudioFormat): Promise<void>;
}
```

### 7.4 Estimated Effort: 7 working days

---

## 8. Phase 7: Testing and Documentation

### 8.1 Objectives

- Comprehensive unit test coverage (>80%)
- Integration tests with mock servers
- End-to-end tests with real APIs (optional, requires keys)
- Complete API documentation
- Usage examples and guides

### 8.2 Test Organization

```
test/
├── unit/
│   └── voice/
│       ├── voiceProviderInterface.test.ts
│       ├── voiceFactory.test.ts
│       ├── voiceRegistry.test.ts
│       ├── compositeVoice.test.ts
│       ├── voiceAgent.test.ts
│       ├── audioUtils.test.ts
│       └── errors.test.ts
│
├── unit/
│   └── adapters/
│       ├── tts/
│       │   ├── elevenLabsTTSHandler.test.ts
│       │   ├── openaiTTSHandler.test.ts
│       │   ├── azureTTSHandler.test.ts
│       │   └── ...
│       ├── stt/
│       │   ├── deepgramSTTHandler.test.ts
│       │   ├── whisperSTTHandler.test.ts
│       │   └── ...
│       └── realtime/
│           ├── openaiRealtimeHandler.test.ts
│           └── geminiLiveHandler.test.ts
│
├── integration/
│   └── voice/
│       ├── tts-providers.test.ts
│       ├── stt-providers.test.ts
│       ├── realtime-providers.test.ts
│       └── voice-agent.test.ts
│
└── fixtures/
    └── audio/
        ├── test-audio-short.wav
        ├── test-audio-long.wav
        └── test-audio-multilang.wav
```

### 8.3 Tasks

| Task ID | Task                                   | Priority | Effort | Dependencies   |
| ------- | -------------------------------------- | -------- | ------ | -------------- |
| P7-01   | Create test audio fixtures             | High     | 0.5d   | None           |
| P7-02   | Write unit tests for all TTS handlers  | High     | 3d     | Phase 2        |
| P7-03   | Write unit tests for all STT handlers  | High     | 2.5d   | Phase 3        |
| P7-04   | Write unit tests for realtime handlers | High     | 2d     | Phase 4        |
| P7-05   | Write unit tests for CompositeVoice    | High     | 1d     | Phase 5        |
| P7-06   | Write unit tests for VoiceAgent        | High     | 1d     | Phase 5        |
| P7-07   | Write integration tests (mock servers) | Medium   | 2d     | P7-02 to P7-06 |
| P7-08   | Write e2e tests (requires API keys)    | Low      | 1d     | P7-07          |
| P7-09   | Create API reference documentation     | High     | 2d     | All phases     |
| P7-10   | Create usage examples                  | High     | 1.5d   | P7-09          |
| P7-11   | Create troubleshooting guide           | Medium   | 1d     | P7-09          |
| P7-12   | Update main README with voice features | Medium   | 0.5d   | P7-10          |

### 8.4 Documentation Structure

```
docs/
├── features/
│   └── voice/
│       ├── overview.md
│       ├── tts-providers.md
│       ├── stt-providers.md
│       ├── realtime-voice.md
│       ├── voice-agent.md
│       └── troubleshooting.md
│
└── sdk/
    └── api-reference/
        └── voice.md
```

### 8.5 Estimated Effort: 18 working days

---

## 9. Effort Summary by Phase

| Phase     | Description                 | Duration        | Effort (Days) |
| --------- | --------------------------- | --------------- | ------------- |
| 1         | Voice Provider Interface    | Week 1-2        | 10            |
| 2         | TTS Provider Implementation | Week 3-4        | 15            |
| 3         | STT Provider Implementation | Week 5-6        | 14            |
| 4         | Realtime Voice (WebRTC)     | Week 7-8        | 15            |
| 5         | Voice Agent Integration     | Week 9-10       | 15            |
| 6         | Audio Processing Utilities  | Week 10-11      | 7             |
| 7         | Testing and Documentation   | Week 11-12      | 18            |
| **Total** |                             | **10-12 weeks** | **94 days**   |

### 9.1 Recommended Team Allocation

| Role             | Phase 1-2        | Phase 3-4      | Phase 5-7            |
| ---------------- | ---------------- | -------------- | -------------------- |
| Senior Developer | Foundation + TTS | STT + Realtime | Integration + Review |
| Mid Developer    | TTS Handlers     | STT Handlers   | Utilities + Tests    |
| Junior Developer | Unit Tests       | Unit Tests     | Documentation        |

---

## 10. Browser and Node.js Compatibility Matrix

### 10.1 Feature Compatibility

| Feature           | Node.js   | Browser       | Notes                      |
| ----------------- | --------- | ------------- | -------------------------- |
| TTS Synthesis     | Full      | Full          | All providers work         |
| TTS Streaming     | Full      | Full          | Uses Response.body streams |
| STT Transcription | Full      | Full          | File/buffer upload         |
| STT Streaming     | Full      | Partial       | WebSocket required         |
| Realtime Voice    | Full (ws) | Full (native) | WebSocket abstraction      |
| Audio File I/O    | Full (fs) | Via File API  | Different APIs             |
| Audio Playback    | N/A       | Web Audio API | Browser-only utility       |
| Microphone Access | N/A       | MediaDevices  | Browser-only               |

### 10.2 Build Considerations

```typescript
// Conditional imports for Node.js-specific packages
export async function getWebSocketClient(): Promise<WebSocketConstructor> {
  if (typeof window !== "undefined") {
    return window.WebSocket;
  }
  const ws = await import("ws");
  return ws.default;
}

// Conditional file handling
export function bufferFromArrayBuffer(ab: ArrayBuffer): Buffer {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(ab);
  }
  // Browser fallback
  return new Uint8Array(ab) as unknown as Buffer;
}
```

### 10.3 Package.json Exports

```json
{
  "exports": {
    "./voice": {
      "import": "./dist/voice/index.js",
      "types": "./dist/voice/index.d.ts"
    },
    "./voice/providers": {
      "import": "./dist/adapters/tts/index.js",
      "types": "./dist/adapters/tts/index.d.ts"
    },
    "./voice/stt": {
      "import": "./dist/adapters/stt/index.js",
      "types": "./dist/adapters/stt/index.d.ts"
    },
    "./voice/realtime": {
      "import": "./dist/adapters/realtime/index.js",
      "types": "./dist/adapters/realtime/index.d.ts"
    }
  }
}
```

---

## 11. Risk Assessment and Mitigation

### 11.1 Technical Risks

| Risk                           | Probability | Impact | Mitigation                                  |
| ------------------------------ | ----------- | ------ | ------------------------------------------- |
| WebSocket compatibility issues | Medium      | High   | Abstract WebSocket, test both environments  |
| API rate limits during testing | Medium      | Medium | Implement mock servers, use test accounts   |
| Audio format incompatibilities | Low         | Medium | Validate formats early, use FFmpeg fallback |
| Provider API changes           | Low         | High   | Version lock SDKs, monitor changelogs       |
| Large audio file handling      | Medium      | Medium | Implement chunking, set size limits         |

### 11.2 Project Risks

| Risk                                  | Probability | Impact | Mitigation                         |
| ------------------------------------- | ----------- | ------ | ---------------------------------- |
| Scope creep (additional providers)    | High        | Medium | Stick to prioritized provider list |
| Integration complexity with NeuroLink | Medium      | High   | Early integration testing          |
| Documentation lag                     | Medium      | Low    | Document as you implement          |

---

## 12. Success Criteria

### 12.1 Phase Completion Criteria

| Phase   | Criteria                                                                    |
| ------- | --------------------------------------------------------------------------- |
| Phase 1 | All interfaces defined, voice module compiles, foundation tests pass        |
| Phase 2 | All P0/P1 TTS handlers work, >80% test coverage                             |
| Phase 3 | All P0/P1 STT handlers work, streaming works, >80% test coverage            |
| Phase 4 | OpenAI Realtime works, Gemini Live refactored, bidirectional audio verified |
| Phase 5 | VoiceAgent integrates with NeuroLink, full conversation pipeline works      |
| Phase 6 | Audio utilities work in both Node.js and browser                            |
| Phase 7 | All tests pass, documentation complete, examples work                       |

### 12.2 Overall Success Metrics

- [ ] 80%+ unit test coverage for voice module
- [ ] All P0 providers fully functional
- [ ] Full end-to-end voice conversation works
- [ ] Documentation covers all public APIs
- [ ] Examples work out of the box
- [ ] Browser compatibility verified
- [ ] Node.js 18+ compatibility verified

---

## 13. Voice Provider Benchmarks

Based on comprehensive research conducted in January 2026, the following benchmarks represent current production performance metrics.

### 13.1 TTS Provider Latency Benchmarks

| Provider         | Model           | Time to First Audio (TTFA) | Quality Score | Languages | Voice Count |
| ---------------- | --------------- | -------------------------- | ------------- | --------- | ----------- |
| **Cartesia**     | Sonic 3         | **40-90ms**                | Very Good     | 40+       | Limited     |
| **ElevenLabs**   | Flash v2.5      | **75ms**                   | Excellent     | 32        | 1200+       |
| **ElevenLabs**   | v3              | ~100ms                     | Best          | 70+       | 1200+       |
| **Google Cloud** | Neural          | ~150ms                     | Good          | 50        | 380+        |
| **Azure**        | Neural          | ~150ms                     | Good          | 147       | 449         |
| **OpenAI**       | tts-1           | ~200ms                     | Good          | Multi     | 13          |
| **OpenAI**       | gpt-4o-mini-tts | ~200ms                     | Highest       | Multi     | 13          |
| **PlayHT**       | PlayDialog      | Good                       | Good          | 140+      | 800+        |

### 13.2 STT Provider Latency Benchmarks

| Provider         | Model             | Streaming Latency | WER (English) | Languages   | Price per Min |
| ---------------- | ----------------- | ----------------- | ------------- | ----------- | ------------- |
| **Deepgram**     | Nova-3            | **<300ms**        | Best-in-class | 36+         | $0.0077       |
| **AssemblyAI**   | Universal         | 300ms (P50)       | 8.4%          | 6 streaming | $0.0025       |
| **OpenAI**       | gpt-4o-transcribe | Non-streaming     | ~7.9%         | 99+         | $0.006        |
| **OpenAI**       | Whisper V3 Turbo  | Non-streaming     | Good          | 99+         | $0.006        |
| **Google Cloud** | Chirp 3           | Good              | Excellent     | 125+        | Usage-based   |
| **Azure**        | Speech            | Good              | Good          | Many        | Varies        |

### 13.3 Quality Benchmarks

#### TTS Quality (Based on MOS scores and user surveys)

| Metric                 | ElevenLabs | OpenAI   | Google   |
| ---------------------- | ---------- | -------- | -------- |
| **Preference Wins**    | 37 times   | 19 times | 19 times |
| **Context Awareness**  | 63%        | 39%      | -        |
| **Hallucination Rate** | 5%         | 10%      | -        |
| **Emotional Range**    | Best       | Limited  | Good     |

#### STT Accuracy (WER - lower is better)

| Scenario         | Best Provider            | Notes                          |
| ---------------- | ------------------------ | ------------------------------ |
| **Clean Speech** | Whisper                  | Deepgram/Gemini within 2%      |
| **Noisy Speech** | Whisper, AssemblyAI, AWS | Similar performance            |
| **Formatting**   | Whisper                  | AssemblyAI strong raw accuracy |
| **Real-time**    | Deepgram                 | <300ms streaming latency       |

---

## 14. The 300ms Rule

### 14.1 Understanding Conversational Latency

Human conversations naturally flow with 200-500ms pauses between speakers. When AI systems exceed these natural boundaries, conversations feel unnatural and user satisfaction drops dramatically.

### 14.2 Latency Impact on User Experience

| Latency Range | User Experience          | Business Impact                 |
| ------------- | ------------------------ | ------------------------------- |
| **<300ms**    | Natural conversation     | Optimal engagement              |
| **300-500ms** | Acceptable, slight delay | Minor friction                  |
| **500-800ms** | Noticeable delay         | Reduced satisfaction            |
| **>800ms**    | Broken conversation flow | **40% higher call abandonment** |

### 14.3 Target Latencies by Component

| Component                | Target | Best-in-Class | Provider                  |
| ------------------------ | ------ | ------------- | ------------------------- |
| **STT**                  | <150ms | **100ms**     | Deepgram Nova-3           |
| **LLM (TTFT)**           | <300ms | **320ms**     | GPT-4o                    |
| **TTS (TTFA)**           | <200ms | **40-75ms**   | Cartesia/ElevenLabs Flash |
| **Total Voice-to-Voice** | <800ms | **~510ms**    | Optimized stack           |

### 14.4 Latency Budget Allocation

For a production voice agent with <800ms total latency target:

```
┌────────────────────────────────────────────────────────────────────┐
│                    800ms Total Budget                              │
├─────────────┬─────────────┬─────────────┬─────────────────────────┤
│   STT       │   LLM       │   TTS       │   Network/Buffer        │
│  ~100ms     │  ~320ms     │  ~75ms      │   ~305ms               │
│  (12.5%)    │  (40%)      │  (9.4%)     │   (38.1%)              │
└─────────────┴─────────────┴─────────────┴─────────────────────────┘
```

### 14.5 Optimization Strategies

#### Model Selection (Latency-First)

```
STT:  Deepgram Nova-3, Whisper V3 Turbo
LLM:  GPT-4o-mini, Claude 3.5 Haiku, Gemini Flash
TTS:  ElevenLabs Flash v2.5, Cartesia Sonic Turbo
```

#### Infrastructure Optimization

- **Co-locate services**: Same data center reduces 200ms+ delay
- **Persistent connections**: WebSocket/gRPC over HTTP per-request
- **Regional deployment**: Minimize network hops
- **Semantic caching**: ~50ms vs seconds for repeated queries

#### Voice Activity Detection (VAD)

- Implement server-side VAD for turn detection
- Configure proper endpointing thresholds
- Balance between early triggering and interruption handling

---

## 15. WebRTC Architecture Patterns

### 15.1 Why WebRTC for Voice AI

| Advantage                | Description                               | Impact                        |
| ------------------------ | ----------------------------------------- | ----------------------------- |
| **Low Latency**          | UDP-like transport prioritizes speed      | Sub-100ms media delivery      |
| **Packet Loss Handling** | Ignores lost packets, continues streaming | Resilient to network issues   |
| **Adaptive Quality**     | Adjusts based on network conditions       | Consistent UX across networks |
| **Built-in Security**    | DTLS and SRTP encryption                  | Secure by default             |
| **Browser Support**      | All modern browsers                       | No client installation        |

### 15.2 Transport Protocol Comparison

| Transport     | Latency          | Network Handling | Best For                       |
| ------------- | ---------------- | ---------------- | ------------------------------ |
| **WebRTC**    | Lowest (~100ms)  | Excellent        | Browser/mobile, poor networks  |
| **WebSocket** | Low (~150ms)     | Good             | Server-side, reliable networks |
| **HTTP**      | Higher (~300ms+) | Good             | Batch processing               |
| **SIP**       | Variable         | Good             | Telephony integration          |

### 15.3 Reference Architecture: Typical Voice AI Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Voice AI Architecture                                │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────────────────┐
                    │         Client (Browser)         │
                    │   Microphone → Web Audio API     │
                    └────────────────┬────────────────┘
                                     │
                              WebRTC │ (~100ms)
                                     │
                    ┌────────────────▼────────────────┐
                    │       WebRTC Media Server        │
                    │       (LiveKit / Daily.co)       │
                    │   - Media routing                │
                    │   - Recording (optional)         │
                    │   - Transport encryption         │
                    └────────────────┬────────────────┘
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         │                           │                           │
         ▼                           ▼                           ▼
┌─────────────────┐        ┌─────────────────┐        ┌─────────────────┐
│      STT        │        │       LLM       │        │      TTS        │
│   (Deepgram)    │───────▶│    (OpenAI/     │───────▶│  (ElevenLabs)   │
│                 │        │   Anthropic)    │        │                 │
│   ~100ms        │        │    ~320ms       │        │    ~75ms        │
└─────────────────┘        └─────────────────┘        └─────────────────┘
```

### 15.4 OpenAI Realtime API with WebRTC

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                      OpenAI Realtime API Architecture                         │
└──────────────────────────────────────────────────────────────────────────────┘

  Browser                                         OpenAI Realtime API
┌─────────────┐                                 ┌─────────────────────┐
│             │                                 │                     │
│  User Audio │◀═══════════ WebRTC ════════════▶│  Speech-to-Speech   │
│             │   (150-250ms text response)     │  GPT-4o-realtime    │
│             │   (220-400ms audio response)    │                     │
└──────┬──────┘                                 └─────────────────────┘
       │
       │ Sideband (WebSocket)
       │
┌──────▼──────┐
│  App Server │
│  - Monitoring│
│  - Tool calls│
│  - Logging   │
└─────────────┘
```

### 15.5 Connection Methods Comparison

| Method        | Latency                           | Use Case            | Notes             |
| ------------- | --------------------------------- | ------------------- | ----------------- |
| **WebRTC**    | ~150-250ms text, ~220-400ms audio | Browser/mobile apps | Lowest latency    |
| **WebSocket** | Higher                            | Server applications | More control      |
| **SIP**       | Variable                          | Telephony           | Phone integration |

### 15.6 Implementation Pattern for NeuroLink

```typescript
// Proposed WebRTC abstraction for NeuroLink
type WebRTCTransport = {
  // Connection management
  connect(config: WebRTCConfig): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // Media handling
  addAudioTrack(track: MediaStreamTrack): void;
  onRemoteAudio(handler: (track: MediaStreamTrack) => void): void;

  // Data channel for signaling
  sendData(data: string): void;
  onData(handler: (data: string) => void): void;
};

// Platform-agnostic implementation
export function createWebRTCTransport(): WebRTCTransport {
  if (typeof window !== "undefined") {
    return new BrowserWebRTCTransport(); // Native RTCPeerConnection
  }
  // Node.js - use wrtc package or LiveKit SDK
  return new NodeWebRTCTransport();
}
```

---

## 16. Updated Provider Priority

Based on benchmarks and production requirements, the following priority order is recommended:

### 16.1 TTS Providers (Updated Priority)

| Priority | Provider     | Model                   | Rationale                                         |
| -------- | ------------ | ----------------------- | ------------------------------------------------- |
| **P0**   | ElevenLabs   | Flash v2.5              | Best quality/latency balance (75ms, 1200+ voices) |
| **P0**   | OpenAI       | tts-1 / gpt-4o-mini-tts | Simple integration for OpenAI users               |
| **P1**   | Cartesia     | Sonic 3                 | Lowest latency (40-90ms), ideal for voice agents  |
| **P1**   | Azure        | Neural                  | Enterprise compliance, 449 voices                 |
| **P2**   | Google Cloud | Neural                  | GCP integration, cost-effective at scale          |
| **P2**   | PlayHT       | PlayDialog              | Voice cloning, multilingual dialogue              |
| **P3**   | Sarvam       | -                       | Indian language specialization                    |
| **P3**   | Murf         | -                       | Content creation focus                            |

### 16.2 STT Providers (Updated Priority)

| Priority | Provider     | Model                          | Rationale                                         |
| -------- | ------------ | ------------------------------ | ------------------------------------------------- |
| **P0**   | Deepgram     | Nova-3                         | Best streaming latency (<300ms), production-ready |
| **P0**   | OpenAI       | Whisper V3 / gpt-4o-transcribe | Best accuracy, 99+ languages                      |
| **P1**   | AssemblyAI   | Universal-Streaming            | Cost-effective ($0.0025/min), good latency        |
| **P1**   | Google Cloud | Chirp 3                        | Enterprise, GCP integration                       |
| **P2**   | Azure        | Speech                         | Enterprise, on-premises option                    |
| **P3**   | Gladia       | -                              | 99+ languages, streaming                          |

### 16.3 Realtime Voice (Updated Priority)

| Priority | Provider | Model        | Rationale                              |
| -------- | -------- | ------------ | -------------------------------------- |
| **P0**   | OpenAI   | Realtime API | WebRTC support, speech-to-speech       |
| **P1**   | Gemini   | Live API     | Existing NeuroLink support, multimodal |
| **P2**   | LiveKit  | Agents       | Self-hosted, full control              |
| **P3**   | Pipecat  | Framework    | Maximum flexibility                    |

---

## 17. Production Voice Stack

### 17.1 Recommended Production Stack (Best Quality)

```
┌───────────────────────────────────────────────────────────────┐
│               Production Voice Stack (Quality)                 │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│   STT:       Deepgram Nova-3                                  │
│              - Streaming: <300ms latency                      │
│              - Features: diarization, smart formatting        │
│              - Price: $0.0077/min                             │
│                                                               │
│   LLM:       Existing NeuroLink Provider                      │
│              - OpenAI GPT-4o/4o-mini                          │
│              - Anthropic Claude 3.5 Sonnet/Haiku              │
│              - Google Gemini Flash/Pro                        │
│                                                               │
│   TTS:       ElevenLabs Flash v2.5                            │
│              - Latency: ~75ms TTFA                            │
│              - Quality: Best emotional range                  │
│              - Voices: 1200+ options                          │
│                                                               │
│   Transport: WebRTC (browser) / WebSocket (server)            │
│                                                               │
│   Expected Voice-to-Voice Latency: ~600-800ms                 │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### 17.2 Cost-Optimized Stack

```
┌───────────────────────────────────────────────────────────────┐
│               Cost-Optimized Voice Stack                       │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│   STT:       AssemblyAI Universal                             │
│              - Price: $0.0025/min (68% cheaper than Deepgram) │
│              - Latency: 300ms P50                             │
│              - Languages: 6 streaming                         │
│                                                               │
│   LLM:       OpenAI GPT-4o-mini / Claude Haiku                │
│              - Fastest LLM options                            │
│              - Lowest token cost                              │
│                                                               │
│   TTS:       Cartesia Sonic                                   │
│              - Latency: 40-90ms (fastest)                     │
│              - Price: $0.03/min                               │
│              - Quality: Very good                             │
│                                                               │
│   Transport: WebSocket                                        │
│                                                               │
│   Expected Voice-to-Voice Latency: ~500-700ms                 │
│   Monthly Cost Savings: ~40-60% vs Production Stack           │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### 17.3 Privacy-First Stack (Self-Hosted)

```
┌───────────────────────────────────────────────────────────────┐
│               Privacy-First Voice Stack                        │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│   STT:       Whisper V3 Turbo (Self-Hosted)                   │
│              - Complete data privacy                          │
│              - No per-minute costs after infrastructure       │
│              - 99+ languages                                  │
│              - 6x faster than Whisper Large                   │
│                                                               │
│   LLM:       Ollama (Local) / Private LLM                     │
│              - Llama 3.x, Mistral, Phi-3                      │
│              - Complete data isolation                        │
│                                                               │
│   TTS:       Coqui TTS (Open Source) / Azure Container        │
│              - On-premises deployment                         │
│              - No data leaves infrastructure                  │
│                                                               │
│   Transport: Private WebSocket                                │
│                                                               │
│   Compliance: HIPAA, SOC2, GDPR ready                         │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### 17.4 Ultra-Low Latency Stack (<500ms target)

```
┌───────────────────────────────────────────────────────────────┐
│               Ultra-Low Latency Stack                          │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│   STT:       Deepgram Nova-3                                  │
│              - Micro-buffering: 100-200ms chunks              │
│              - Interim results enabled                        │
│              - Target: ~100ms                                 │
│                                                               │
│   LLM:       GPT-4o-mini with streaming                       │
│              - First token: ~200ms                            │
│              - Stream to TTS immediately                      │
│                                                               │
│   TTS:       Cartesia Sonic Turbo                             │
│              - TTFA: 40-75ms                                  │
│              - Streaming playback                             │
│                                                               │
│   Optimizations:                                              │
│   - Co-located services (same region)                         │
│   - Persistent WebSocket connections                          │
│   - Semantic caching for common queries                       │
│   - Aggressive context pruning                                │
│                                                               │
│   Expected Voice-to-Voice Latency: ~400-500ms                 │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### 17.5 Voice Framework Integration Options

| Framework               | Best For               | Integration Effort | Notes                                |
| ----------------------- | ---------------------- | ------------------ | ------------------------------------ |
| **OpenAI Realtime API** | Unified voice (WebRTC) | Low                | Single API for speech-to-speech      |
| **LiveKit Agents**      | Scale + compliance     | Medium             | Open-source, semantic turn detection |
| **Pipecat**             | Flexibility            | Medium             | Mix any STT/LLM/TTS                  |
| **Custom Pipeline**     | Full control           | High               | Maximum customization                |

### 17.6 Provider Combination Matrix

| Use Case                  | STT                   | LLM          | TTS             | Transport  |
| ------------------------- | --------------------- | ------------ | --------------- | ---------- |
| **Customer Support**      | Deepgram              | GPT-4o       | ElevenLabs      | WebRTC     |
| **Healthcare**            | Whisper (self-hosted) | Private LLM  | Azure Container | Private WS |
| **Gaming/Entertainment**  | Deepgram              | GPT-4o-mini  | ElevenLabs v3   | WebRTC     |
| **Education**             | AssemblyAI            | Claude Haiku | PlayHT          | WebSocket  |
| **Voice Assistants**      | Deepgram              | GPT-4o-mini  | Cartesia        | WebRTC     |
| **Transcription Service** | Whisper API           | N/A          | N/A             | HTTP       |
| **Podcast Production**    | Whisper               | N/A          | ElevenLabs v3   | HTTP       |

---

## 18. Appendix

### 18.1 API Endpoints Reference

| Provider     | TTS Endpoint                                             | STT Endpoint                                                                             | Realtime Endpoint                                    |
| ------------ | -------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| ElevenLabs   | `api.elevenlabs.io/v1/text-to-speech/{voice_id}`         | `api.elevenlabs.io/v1/speech-to-text` (Scribe v2)                                        | N/A                                                  |
| OpenAI       | `api.openai.com/v1/audio/speech`                         | `api.openai.com/v1/audio/transcriptions`                                                 | `wss://api.openai.com/v1/realtime`                   |
| Cartesia     | `api.cartesia.ai/tts/bytes`                              | N/A                                                                                      | N/A                                                  |
| Azure        | `{region}.tts.speech.microsoft.com/cognitiveservices/v1` | `{region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1` | N/A                                                  |
| Deepgram     | N/A                                                      | `api.deepgram.com/v1/listen`                                                             | `wss://api.deepgram.com/v1/listen`                   |
| AssemblyAI   | N/A                                                      | `api.assemblyai.com/v2/transcript`                                                       | `wss://streaming.assemblyai.com/v3/ws`               |
| Gladia       | N/A                                                      | `api.gladia.io/v2/transcription`                                                         | `wss://api.gladia.io/audio/text/audio-transcription` |
| Gemini       | N/A                                                      | N/A                                                                                      | `generativelanguage.googleapis.com`                  |
| Google Cloud | `texttospeech.googleapis.com/v1/text:synthesize`         | `speech.googleapis.com/v1/speech:recognize`                                              | N/A                                                  |
| Sarvam       | `api.sarvam.ai/text-to-speech`                           | `api.sarvam.ai/speech-to-text`                                                           | N/A                                                  |
| PlayHT       | `api.play.ht/api/v2/tts`                                 | N/A                                                                                      | N/A                                                  |

### 18.2 Pricing Reference (January 2026)

| Provider         | Service       | Price         | Notes                |
| ---------------- | ------------- | ------------- | -------------------- |
| **Deepgram**     | STT Streaming | $0.0077/min   | Nova-3               |
| **AssemblyAI**   | STT           | $0.0025/min   | Universal            |
| **OpenAI**       | Whisper API   | $0.006/min    | -                    |
| **OpenAI**       | TTS-1         | $15/1M chars  | Standard             |
| **OpenAI**       | TTS-1-HD      | $30/1M chars  | High quality         |
| **OpenAI**       | Realtime API  | ~$20/hour     | Two-way conversation |
| **ElevenLabs**   | Starter       | $5/month      | 30,000 chars         |
| **ElevenLabs**   | Pro           | $99/month     | 500,000 chars        |
| **Cartesia**     | TTS           | $0.03/min     | Credit-based         |
| **Google Cloud** | TTS Standard  | ~$4/1M chars  | -                    |
| **Google Cloud** | TTS Neural    | ~$16/1M chars | -                    |
| **PlayHT**       | Creator       | $39/month     | 250,000 chars        |

### 18.3 Related Documents

- [Voice Integration Feature Spec](/docs/mastra-features-implementation/08-voice-speech-integration.md)
- [Voice and Speech Research](/docs/mastra-features-implementation/research/online/05-voice-speech-research.md)
- [Multimodal Evolution Analysis](/docs/mastra-features-implementation/research/git-history/06-multimodal-evolution.md)
- [NeuroLink Architecture Patterns](/docs/mastra-features-implementation/00-neurolink-architecture-patterns.md)
- [Existing TTS Types](/src/lib/types/ttsTypes.ts)
- [TTSProcessor Implementation](/src/lib/utils/ttsProcessor.ts)
- [GoogleTTSHandler Example](/src/lib/adapters/tts/googleTTSHandler.ts)

### 18.4 Research Sources

#### Official Documentation

- [ElevenLabs Documentation](https://elevenlabs.io/docs/overview/capabilities/text-to-speech)
- [OpenAI TTS Documentation](https://platform.openai.com/docs/guides/text-to-speech)
- [OpenAI Realtime API](https://platform.openai.com/docs/guides/realtime)
- [Deepgram Documentation](https://developers.deepgram.com/docs)
- [AssemblyAI Documentation](https://www.assemblyai.com/docs)
- [Cartesia Documentation](https://docs.cartesia.ai/)
- [LiveKit Agents](https://docs.livekit.io/agents/)

#### Latency and Best Practices

- [Engineering Real-Time Voice Agent Latency](https://cresta.com/blog/engineering-for-real-time-voice-agent-latency)
- [The 300ms Rule](https://www.assemblyai.com/blog/low-latency-voice-ai)
- [Voice Latency Optimization](https://elevenlabs.io/blog/how-to-optimize-latency-for-conversational-ai)
- [Sierra Voice Latency Engineering](https://sierra.ai/blog/voice-latency)

#### WebRTC and Architecture

- [WebRTC for Voice AI Architecture](https://webrtc.ventures/2025/10/why-webrtc-is-the-best-transport-for-real-time-voice-ai-architectures/)
- [WebRTC Tech Stack Guide](https://webrtc.ventures/2026/01/webrtc-tech-stack-guide-architecture-for-scalable-real-time-applications/)
