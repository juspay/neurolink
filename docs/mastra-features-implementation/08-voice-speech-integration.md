---
title: Voice and Speech Integration Implementation Guide
description: Complete implementation guide for Mastra-style voice capabilities in NeuroLink including TTS, STT, and realtime voice
keywords: voice, speech, tts, stt, text-to-speech, speech-to-text, realtime, elevenlabs, deepgram, whisper, gemini live
---

# Voice and Speech Integration Implementation Guide

This document provides a comprehensive implementation guide for adding Mastra-style voice capabilities to NeuroLink, including Text-to-Speech (TTS), Speech-to-Text (STT), and Realtime Voice integration.

---

## Implementation Status

**Status: COMPLETE (100%)**

Last Updated: 2026-01-31

### Previously Blocking Issues - RESOLVED

The following issues that were previously blocking completion have been **RESOLVED**:

| Issue                       | Status       | Details                                                      |
| --------------------------- | ------------ | ------------------------------------------------------------ |
| `audio-utils.ts` missing    | **RESOLVED** | File exists at `src/lib/voice/audio-utils.ts` (563 lines)    |
| `stream-handler.ts` missing | **RESOLVED** | File exists at `src/lib/voice/stream-handler.ts` (544 lines) |

### Completed Components

| Component                  | Status | Location                                      |
| -------------------------- | ------ | --------------------------------------------- |
| **Core Voice Module**      | DONE   | `src/lib/voice/`                              |
| VoiceFactory               | DONE   | `src/lib/voice/voiceFactory.ts`               |
| VoiceRegistry              | DONE   | `src/lib/voice/voiceRegistry.ts`              |
| CompositeVoice             | DONE   | `src/lib/voice/compositeVoice.ts`             |
| VoiceAgent                 | DONE   | `src/lib/voice/voiceAgent.ts`                 |
| Voice Errors               | DONE   | `src/lib/voice/errors.ts`                     |
| Audio Utilities            | DONE   | `src/lib/voice/audio-utils.ts` (563 lines)    |
| Stream Handler             | DONE   | `src/lib/voice/stream-handler.ts` (544 lines) |
| **TTS Providers (8)**      |        | `src/lib/adapters/tts/`                       |
| Google Cloud TTS           | DONE   | `googleTTSHandler.ts`                         |
| ElevenLabs TTS             | DONE   | `elevenLabsTTSHandler.ts`                     |
| OpenAI TTS                 | DONE   | `openaiTTSHandler.ts`                         |
| Azure Speech TTS           | DONE   | `azureTTSHandler.ts`                          |
| Sarvam AI TTS              | DONE   | `sarvamTTSHandler.ts`                         |
| Murf TTS                   | DONE   | `murfTTSHandler.ts`                           |
| Play.ai TTS                | DONE   | `playaiTTSHandler.ts`                         |
| Speechify TTS              | DONE   | `speechifyTTSHandler.ts`                      |
| **STT Providers (6)**      |        | `src/lib/adapters/stt/`                       |
| AssemblyAI STT             | DONE   | `assemblyaiSTTHandler.ts`                     |
| Azure Speech STT           | DONE   | `azureSTTHandler.ts`                          |
| Deepgram STT               | DONE   | `deepgramSTTHandler.ts`                       |
| Gladia STT                 | DONE   | `gladiaSTTHandler.ts`                         |
| Google Cloud STT           | DONE   | `googleSTTHandler.ts`                         |
| OpenAI Whisper STT         | DONE   | `whisperSTTHandler.ts`                        |
| **Realtime Providers (2)** |        | `src/lib/adapters/realtime/`                  |
| OpenAI Realtime            | DONE   | `openaiRealtimeHandler.ts`                    |
| Gemini Live                | DONE   | `geminiLiveHandler.ts`                        |
| **Type Definitions**       |        | `src/lib/types/`                              |
| TTS Types                  | DONE   | `ttsTypes.ts`                                 |
| STT Types                  | DONE   | `sttTypes.ts`                                 |
| Realtime Types             | DONE   | `realtimeTypes.ts`                            |
| Voice Types                | DONE   | `voiceTypes.ts`                               |
| **SDK Integration**        |        | `src/lib/`                                    |
| NeuroLink Voice Methods    | DONE   | `neurolink.ts`                                |
| Main Exports               | DONE   | `index.ts`                                    |

### Summary of Features Implemented

1. **Text-to-Speech (TTS)**
   - 8 providers: Google Cloud, ElevenLabs, OpenAI, Azure, Sarvam, Murf, Play.ai, Speechify
   - Streaming synthesis support
   - Multiple voice and language options
   - Audio format conversion

2. **Speech-to-Text (STT)**
   - 6 providers: AssemblyAI, Azure, Deepgram, Gladia, Google, Whisper
   - Speaker diarization support
   - Word-level timestamps
   - Multi-language transcription

3. **Realtime Voice**
   - OpenAI Realtime API integration
   - Gemini Live API integration
   - Bidirectional audio streaming
   - Function calling support

4. **Composite Voice**
   - Combined TTS + STT for conversations
   - Conversation history tracking
   - Session management

5. **VoiceAgent**
   - Complete voice-to-voice pipeline
   - NeuroLink AI integration
   - Event-driven architecture
   - Realtime session management

6. **Audio Utilities**
   - Format detection (WAV, MP3, FLAC, OGG, etc.)
   - Buffer validation
   - PCM to WAV conversion
   - Resampling and normalization
   - Silence detection

7. **Stream Utilities**
   - Audio stream accumulator
   - Transcription stream accumulator
   - Batch and rate-limited streaming
   - Timeout handling

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Design](#architecture-design)
3. [Voice Provider Interface](#voice-provider-interface)
4. [Text-to-Speech (TTS) Providers](#text-to-speech-tts-providers)
5. [Speech-to-Text (STT) Providers](#speech-to-text-stt-providers)
6. [Realtime Voice](#realtime-voice)
7. [Composite Voice](#composite-voice)
8. [TypeScript Types and Interfaces](#typescript-types-and-interfaces)
9. [Integration with NeuroLink Agents](#integration-with-neurolink-agents)
10. [Step-by-Step Implementation Plan](#step-by-step-implementation-plan)
11. [Code Examples](#code-examples)

---

## Overview

### Current State

NeuroLink already has foundational TTS support through:

- `TTSHandler` interface in `src/lib/utils/ttsProcessor.ts`
- `GoogleTTSHandler` implementation in `src/lib/adapters/tts/googleTTSHandler.ts`
- Audio streaming types in `src/lib/types/streamTypes.ts`
- TTS types in `src/lib/types/ttsTypes.ts`

### Target State (Mastra-Style) - ACHIEVED

The following capabilities have been fully implemented:

- **8 TTS providers**: Google Cloud, ElevenLabs, OpenAI, Azure, Sarvam, Murf, Play.ai, Speechify
- **6 STT providers**: AssemblyAI, Azure, Deepgram, Gladia, Google, Whisper
- **2 Realtime providers**: OpenAI Realtime API, Google Gemini Live API
- **Composite Voice**: Combined TTS + STT for full voice conversations

### Key Design Principles

1. **Factory Pattern**: Follow NeuroLink's existing provider factory pattern
2. **Interface Consistency**: Maintain consistent interfaces across all voice providers
3. **Streaming First**: Prioritize streaming audio support for realtime applications
4. **Type Safety**: Comprehensive TypeScript types for all voice operations
5. **Error Handling**: Consistent error handling with TTSError/STTError classes

---

## Architecture Design

### Directory Structure

```
src/lib/
├── voice/                          # New voice module
│   ├── index.ts                    # Voice module exports
│   ├── voiceProviderInterface.ts   # Abstract interface
│   ├── voiceFactory.ts             # Voice provider factory
│   ├── voiceRegistry.ts            # Voice provider registration
│   ├── compositeVoice.ts           # Combined TTS + STT
│   └── errors.ts                   # Voice-specific errors
│
├── adapters/
│   ├── tts/                        # Text-to-Speech adapters
│   │   ├── googleTTSHandler.ts     # Existing
│   │   ├── elevenLabsTTSHandler.ts # New
│   │   ├── openaiTTSHandler.ts     # New
│   │   ├── azureTTSHandler.ts      # New
│   │   ├── sarvamTTSHandler.ts     # New
│   │   ├── murfTTSHandler.ts       # New
│   │   ├── playaiTTSHandler.ts     # New
│   │   └── speechifyTTSHandler.ts  # New
│   │
│   ├── stt/                        # Speech-to-Text adapters (New)
│   │   ├── deepgramSTTHandler.ts   # New
│   │   ├── gladiaSTTHandler.ts     # New
│   │   └── whisperSTTHandler.ts    # New
│   │
│   └── realtime/                   # Realtime voice adapters (New)
│       ├── openaiRealtimeHandler.ts    # New
│       └── geminiLiveHandler.ts        # New (partially exists)
│
├── types/
│   ├── ttsTypes.ts                 # Existing, extend
│   ├── sttTypes.ts                 # New
│   ├── realtimeTypes.ts            # New
│   └── voiceTypes.ts               # New unified voice types
```

### Component Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                     VoiceProviderInterface                       │
│  ┌────────────┬────────────┬────────────┬────────────────────┐  │
│  │    TTS     │    STT     │  Realtime  │   Composite        │  │
│  └────────────┴────────────┴────────────┴────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
         │              │            │               │
         ▼              ▼            ▼               ▼
┌────────────┐  ┌────────────┐  ┌──────────┐  ┌──────────────┐
│ TTSHandler │  │ STTHandler │  │ Realtime │  │ Composite    │
│ Interface  │  │ Interface  │  │ Handler  │  │ Voice        │
└────────────┘  └────────────┘  └──────────┘  └──────────────┘
       │              │              │               │
       ▼              ▼              ▼               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Provider Implementations                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐│
│  │ElevenLabs│ │ Deepgram │ │ OpenAI   │ │ Gemini Live      ││
│  │ OpenAI   │ │ Gladia   │ │ Realtime │ │ (existing)       ││
│  │ Azure    │ │ Whisper  │ │          │ │                  ││
│  │ Sarvam   │ │          │ │          │ │                  ││
│  │ Murf     │ │          │ │          │ │                  ││
│  │ Play.ai  │ │          │ │          │ │                  ││
│  │Speechify │ │          │ │          │ │                  ││
│  │ Google   │ │          │ │          │ │                  ││
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

## Voice Provider Interface

### Abstract Voice Provider Interface

```typescript
// src/lib/voice/voiceProviderInterface.ts

import type { TTSOptions, TTSResult, TTSVoice } from "../types/ttsTypes.js";
import type {
  STTOptions,
  STTResult,
  TranscriptionSegment,
} from "../types/sttTypes.js";
import type {
  RealtimeConfig,
  RealtimeSession,
} from "../types/realtimeTypes.js";

/**
 * Voice capability types
 */
export type VoiceCapability = "tts" | "stt" | "realtime" | "streaming";

/**
 * Voice provider configuration
 */
export type VoiceProviderConfig = {
  /** Provider identifier */
  name: string;
  /** API key or credentials */
  apiKey?: string;
  /** Custom endpoint URL */
  baseUrl?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Maximum retries for failed requests */
  maxRetries?: number;
  /** Provider-specific options */
  options?: Record<string, unknown>;
};

/**
 * Abstract voice provider type
 *
 * All voice providers (TTS, STT, Realtime) implement this type.
 * Follows the same pattern as AIProvider in NeuroLink.
 */
export type VoiceProvider = {
  /**
   * Provider name identifier
   */
  readonly name: string;

  /**
   * Get supported capabilities
   */
  getCapabilities(): VoiceCapability[];

  /**
   * Check if provider is properly configured
   */
  isConfigured(): boolean;

  /**
   * Validate provider configuration
   */
  validateConfig(): Promise<{ valid: boolean; errors: string[] }>;

  /**
   * Get provider-specific options schema
   */
  getOptionsSchema?(): Record<string, unknown>;
};

/**
 * TTS-capable voice provider
 */
export type TTSProvider = VoiceProvider & {
  /**
   * Synthesize text to speech
   */
  synthesize(text: string, options: TTSOptions): Promise<TTSResult>;

  /**
   * Stream synthesized audio chunks
   */
  synthesizeStream?(
    text: string,
    options: TTSOptions,
  ): AsyncIterable<TTSStreamChunk>;

  /**
   * Get available voices
   */
  getVoices(languageCode?: string): Promise<TTSVoice[]>;

  /**
   * Maximum text length supported
   */
  readonly maxTextLength: number;
};

/**
 * STT-capable voice provider
 */
export type STTProvider = VoiceProvider & {
  /**
   * Transcribe audio to text
   */
  transcribe(
    audio: Buffer | ArrayBuffer,
    options: STTOptions,
  ): Promise<STTResult>;

  /**
   * Stream transcription (live audio input)
   */
  transcribeStream?(
    audioStream: AsyncIterable<Buffer>,
    options: STTOptions,
  ): AsyncIterable<TranscriptionSegment>;

  /**
   * Get supported languages
   */
  getSupportedLanguages(): Promise<string[]>;

  /**
   * Get supported audio formats
   */
  getSupportedFormats(): string[];
};

/**
 * Realtime voice provider (bidirectional audio)
 */
export type RealtimeVoiceProvider = VoiceProvider & {
  /**
   * Create a new realtime session
   */
  connect(config: RealtimeConfig): Promise<RealtimeSession>;

  /**
   * Check if connected
   */
  isConnected(): boolean;

  /**
   * Disconnect from realtime session
   */
  disconnect(): Promise<void>;

  /**
   * Get session configuration options
   */
  getSessionConfig(): RealtimeConfig | null;
};

/**
 * TTS stream chunk for streaming synthesis
 */
export type TTSStreamChunk = {
  /** Audio data chunk */
  data: Buffer;
  /** Chunk sequence number */
  index: number;
  /** Whether this is the final chunk */
  isFinal: boolean;
  /** Audio format */
  format: string;
  /** Sample rate */
  sampleRate?: number;
  /** Timestamp offset in audio (milliseconds) */
  timestampMs?: number;
};
```

---

## Text-to-Speech (TTS) Providers

### 1. ElevenLabs TTS Handler

```typescript
// src/lib/adapters/tts/elevenLabsTTSHandler.ts

import type { TTSHandler } from "../../utils/ttsProcessor.js";
import type { TTSOptions, TTSResult, TTSVoice } from "../../types/ttsTypes.js";
import { TTSError, TTS_ERROR_CODES } from "../../utils/ttsProcessor.js";
import { ErrorCategory, ErrorSeverity } from "../../constants/enums.js";
import { logger } from "../../utils/logger.js";

/**
 * ElevenLabs voice model options
 */
export type ElevenLabsModel =
  | "eleven_multilingual_v2"
  | "eleven_turbo_v2_5"
  | "eleven_turbo_v2"
  | "eleven_monolingual_v1";

/**
 * ElevenLabs-specific TTS options
 */
export type ElevenLabsTTSOptions = TTSOptions & {
  /** Voice model to use */
  model?: ElevenLabsModel;
  /** Stability (0-1) - higher = more consistent */
  stability?: number;
  /** Similarity boost (0-1) - higher = more similar to original voice */
  similarityBoost?: number;
  /** Style (0-1) - experimental emotional expression */
  style?: number;
  /** Use speaker boost for clearer audio */
  useSpeakerBoost?: boolean;
};

/**
 * ElevenLabs Text-to-Speech Handler
 *
 * @see https://elevenlabs.io/docs/api-reference
 */
export class ElevenLabsTTSHandler implements TTSHandler {
  private readonly apiKey: string | null;
  private readonly baseUrl = "https://api.elevenlabs.io/v1";
  private voicesCache: { voices: TTSVoice[]; timestamp: number } | null = null;
  private static readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * ElevenLabs maximum text length per request
   * Free tier: 2,500 characters, Paid: 5,000+ characters
   */
  public readonly maxTextLength = 5000;

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env.ELEVENLABS_API_KEY ?? null;
  }

  isConfigured(): boolean {
    return this.apiKey !== null;
  }

  async getVoices(languageCode?: string): Promise<TTSVoice[]> {
    if (!this.apiKey) {
      throw new TTSError({
        code: TTS_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
        message: "ElevenLabs API key not configured",
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }

    // Return cached voices if valid
    if (
      this.voicesCache &&
      Date.now() - this.voicesCache.timestamp <
        ElevenLabsTTSHandler.CACHE_TTL_MS &&
      !languageCode
    ) {
      return this.voicesCache.voices;
    }

    try {
      const response = await fetch(`${this.baseUrl}/voices`, {
        headers: {
          "xi-api-key": this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      const data = (await response.json()) as {
        voices: Array<{
          voice_id: string;
          name: string;
          labels?: { language?: string; accent?: string; gender?: string };
          preview_url?: string;
        }>;
      };

      const voices: TTSVoice[] = data.voices.map((voice) => ({
        id: voice.voice_id,
        name: voice.name,
        languageCode: voice.labels?.language ?? "en",
        languageCodes: [voice.labels?.language ?? "en"],
        gender: this.mapGender(voice.labels?.gender),
        type: "neural" as const,
        description: voice.labels?.accent,
      }));

      // Filter by language if specified
      const filteredVoices = languageCode
        ? voices.filter((v) => v.languageCode.startsWith(languageCode))
        : voices;

      // Cache if no filter
      if (!languageCode) {
        this.voicesCache = { voices, timestamp: Date.now() };
      }

      return filteredVoices;
    } catch (err) {
      logger.error("Failed to fetch ElevenLabs voices:", err);
      return [];
    }
  }

  async synthesize(text: string, options: TTSOptions): Promise<TTSResult> {
    if (!this.apiKey) {
      throw new TTSError({
        code: TTS_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
        message: "ElevenLabs API key not configured. Set ELEVENLABS_API_KEY.",
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }

    const startTime = Date.now();
    const elevenLabsOptions = options as ElevenLabsTTSOptions;

    // Default voice: Rachel (21m00Tcm4TlvDq8ikWAM)
    const voiceId = options.voice ?? "21m00Tcm4TlvDq8ikWAM";
    const model = elevenLabsOptions.model ?? "eleven_multilingual_v2";

    try {
      const response = await fetch(
        `${this.baseUrl}/text-to-speech/${voiceId}`,
        {
          method: "POST",
          headers: {
            "xi-api-key": this.apiKey,
            "Content-Type": "application/json",
            Accept: this.getAcceptHeader(options.format ?? "mp3"),
          },
          body: JSON.stringify({
            text,
            model_id: model,
            voice_settings: {
              stability: elevenLabsOptions.stability ?? 0.5,
              similarity_boost: elevenLabsOptions.similarityBoost ?? 0.75,
              style: elevenLabsOptions.style ?? 0,
              use_speaker_boost: elevenLabsOptions.useSpeakerBoost ?? true,
            },
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new TTSError({
          code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
          message: `ElevenLabs synthesis failed: ${response.status} - ${errorText}`,
          category: ErrorCategory.EXECUTION,
          severity: ErrorSeverity.HIGH,
          retriable: response.status >= 500,
        });
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const latency = Date.now() - startTime;

      return {
        buffer,
        format: options.format ?? "mp3",
        size: buffer.length,
        voice: voiceId,
        metadata: {
          latency,
          provider: "elevenlabs",
          model,
        },
      };
    } catch (err) {
      if (err instanceof TTSError) throw err;

      const latency = Date.now() - startTime;
      throw new TTSError({
        code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
        message: `ElevenLabs synthesis failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        category: ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable: true,
        context: { latency },
        originalError: err instanceof Error ? err : undefined,
      });
    }
  }

  /**
   * Stream audio synthesis for real-time playback
   */
  async *synthesizeStream(
    text: string,
    options: TTSOptions,
  ): AsyncIterable<TTSStreamChunk> {
    if (!this.apiKey) {
      throw new TTSError({
        code: TTS_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
        message: "ElevenLabs API key not configured",
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }

    const voiceId = options.voice ?? "21m00Tcm4TlvDq8ikWAM";
    const elevenLabsOptions = options as ElevenLabsTTSOptions;
    const model = elevenLabsOptions.model ?? "eleven_multilingual_v2";

    const response = await fetch(
      `${this.baseUrl}/text-to-speech/${voiceId}/stream`,
      {
        method: "POST",
        headers: {
          "xi-api-key": this.apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: model,
          voice_settings: {
            stability: elevenLabsOptions.stability ?? 0.5,
            similarity_boost: elevenLabsOptions.similarityBoost ?? 0.75,
          },
        }),
      },
    );

    if (!response.ok || !response.body) {
      throw new TTSError({
        code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
        message: `ElevenLabs streaming failed: ${response.status}`,
        category: ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable: true,
      });
    }

    const reader = response.body.getReader();
    let index = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          yield {
            data: Buffer.alloc(0),
            index,
            isFinal: true,
            format: "mp3",
          };
          break;
        }

        yield {
          data: Buffer.from(value),
          index: index++,
          isFinal: false,
          format: "mp3",
        };
      }
    } finally {
      reader.releaseLock();
    }
  }

  private getAcceptHeader(format: string): string {
    switch (format) {
      case "mp3":
        return "audio/mpeg";
      case "wav":
        return "audio/wav";
      case "ogg":
        return "audio/ogg";
      default:
        return "audio/mpeg";
    }
  }

  private mapGender(gender?: string): "male" | "female" | "neutral" {
    if (!gender) return "neutral";
    const g = gender.toLowerCase();
    if (g === "male" || g === "m") return "male";
    if (g === "female" || g === "f") return "female";
    return "neutral";
  }
}
```

### 2. OpenAI TTS Handler

```typescript
// src/lib/adapters/tts/openaiTTSHandler.ts

import type { TTSHandler } from "../../utils/ttsProcessor.js";
import type { TTSOptions, TTSResult, TTSVoice } from "../../types/ttsTypes.js";
import { TTSError, TTS_ERROR_CODES } from "../../utils/ttsProcessor.js";
import { ErrorCategory, ErrorSeverity } from "../../constants/enums.js";
import { logger } from "../../utils/logger.js";

/**
 * OpenAI TTS voice options
 */
export type OpenAITTSVoice =
  | "alloy"
  | "echo"
  | "fable"
  | "onyx"
  | "nova"
  | "shimmer";

/**
 * OpenAI TTS model options
 */
export type OpenAITTSModel = "tts-1" | "tts-1-hd";

/**
 * OpenAI-specific TTS options
 */
export type OpenAITTSOptions = TTSOptions & {
  /** TTS model: tts-1 (faster) or tts-1-hd (higher quality) */
  model?: OpenAITTSModel;
};

/**
 * OpenAI Text-to-Speech Handler
 *
 * @see https://platform.openai.com/docs/api-reference/audio/createSpeech
 */
export class OpenAITTSHandler implements TTSHandler {
  private readonly apiKey: string | null;
  private readonly baseUrl = "https://api.openai.com/v1";

  /**
   * OpenAI TTS maximum input: 4096 characters
   */
  public readonly maxTextLength = 4096;

  /**
   * Available OpenAI TTS voices (static, no API discovery)
   */
  private static readonly VOICES: TTSVoice[] = [
    {
      id: "alloy",
      name: "Alloy",
      languageCode: "en",
      languageCodes: ["en"],
      gender: "neutral",
      type: "neural",
    },
    {
      id: "echo",
      name: "Echo",
      languageCode: "en",
      languageCodes: ["en"],
      gender: "male",
      type: "neural",
    },
    {
      id: "fable",
      name: "Fable",
      languageCode: "en",
      languageCodes: ["en"],
      gender: "neutral",
      type: "neural",
    },
    {
      id: "onyx",
      name: "Onyx",
      languageCode: "en",
      languageCodes: ["en"],
      gender: "male",
      type: "neural",
    },
    {
      id: "nova",
      name: "Nova",
      languageCode: "en",
      languageCodes: ["en"],
      gender: "female",
      type: "neural",
    },
    {
      id: "shimmer",
      name: "Shimmer",
      languageCode: "en",
      languageCodes: ["en"],
      gender: "female",
      type: "neural",
    },
  ];

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env.OPENAI_API_KEY ?? null;
  }

  isConfigured(): boolean {
    return this.apiKey !== null;
  }

  async getVoices(_languageCode?: string): Promise<TTSVoice[]> {
    // OpenAI doesn't have a voices discovery API
    // All voices support multiple languages through the model
    return OpenAITTSHandler.VOICES;
  }

  async synthesize(text: string, options: TTSOptions): Promise<TTSResult> {
    if (!this.apiKey) {
      throw new TTSError({
        code: TTS_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
        message: "OpenAI API key not configured. Set OPENAI_API_KEY.",
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }

    const startTime = Date.now();
    const openaiOptions = options as OpenAITTSOptions;

    const voice = (options.voice ?? "alloy") as OpenAITTSVoice;
    const model = openaiOptions.model ?? "tts-1";
    const responseFormat = this.mapFormat(options.format ?? "mp3");

    try {
      const response = await fetch(`${this.baseUrl}/audio/speech`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          input: text,
          voice,
          response_format: responseFormat,
          speed: options.speed ?? 1.0,
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        throw new TTSError({
          code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
          message: `OpenAI TTS failed: ${response.status} - ${errorData.error?.message ?? "Unknown error"}`,
          category: ErrorCategory.EXECUTION,
          severity: ErrorSeverity.HIGH,
          retriable: response.status >= 500,
        });
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const latency = Date.now() - startTime;

      return {
        buffer,
        format: options.format ?? "mp3",
        size: buffer.length,
        voice,
        metadata: {
          latency,
          provider: "openai",
          model,
        },
      };
    } catch (err) {
      if (err instanceof TTSError) throw err;

      const latency = Date.now() - startTime;
      throw new TTSError({
        code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
        message: `OpenAI TTS failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        category: ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable: true,
        context: { latency },
        originalError: err instanceof Error ? err : undefined,
      });
    }
  }

  private mapFormat(format: string): string {
    switch (format) {
      case "mp3":
        return "mp3";
      case "wav":
        return "wav";
      case "ogg":
        return "opus";
      case "opus":
        return "opus";
      case "flac":
        return "flac";
      case "aac":
        return "aac";
      default:
        return "mp3";
    }
  }
}
```

### 3. Azure Speech TTS Handler

```typescript
// src/lib/adapters/tts/azureTTSHandler.ts

import type { TTSHandler } from "../../utils/ttsProcessor.js";
import type { TTSOptions, TTSResult, TTSVoice } from "../../types/ttsTypes.js";
import { TTSError, TTS_ERROR_CODES } from "../../utils/ttsProcessor.js";
import { ErrorCategory, ErrorSeverity } from "../../constants/enums.js";
import { logger } from "../../utils/logger.js";

/**
 * Azure Speech-specific options
 */
export type AzureTTSOptions = TTSOptions & {
  /** Azure Speech region */
  region?: string;
  /** Output audio format */
  outputFormat?: string;
  /** SSML input (overrides text) */
  ssml?: string;
};

/**
 * Azure Cognitive Services Speech-to-Text Handler
 *
 * @see https://learn.microsoft.com/en-us/azure/ai-services/speech-service/
 */
export class AzureTTSHandler implements TTSHandler {
  private readonly subscriptionKey: string | null;
  private readonly region: string;
  private voicesCache: { voices: TTSVoice[]; timestamp: number } | null = null;
  private static readonly CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

  public readonly maxTextLength = 10000; // Azure supports up to ~10KB

  constructor(subscriptionKey?: string, region?: string) {
    this.subscriptionKey =
      subscriptionKey ?? process.env.AZURE_SPEECH_KEY ?? null;
    this.region = region ?? process.env.AZURE_SPEECH_REGION ?? "eastus";
  }

  isConfigured(): boolean {
    return this.subscriptionKey !== null;
  }

  async getVoices(languageCode?: string): Promise<TTSVoice[]> {
    if (!this.subscriptionKey) {
      throw new TTSError({
        code: TTS_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
        message: "Azure Speech subscription key not configured",
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }

    // Return cached if valid
    if (
      this.voicesCache &&
      Date.now() - this.voicesCache.timestamp < AzureTTSHandler.CACHE_TTL_MS &&
      !languageCode
    ) {
      return this.voicesCache.voices;
    }

    try {
      const url = `https://${this.region}.tts.speech.microsoft.com/cognitiveservices/voices/list`;
      const response = await fetch(url, {
        headers: {
          "Ocp-Apim-Subscription-Key": this.subscriptionKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Azure voices API error: ${response.status}`);
      }

      const data = (await response.json()) as Array<{
        ShortName: string;
        DisplayName: string;
        LocalName: string;
        Locale: string;
        Gender: string;
        VoiceType: string;
      }>;

      const voices: TTSVoice[] = data.map((v) => ({
        id: v.ShortName,
        name: v.DisplayName,
        languageCode: v.Locale,
        languageCodes: [v.Locale],
        gender: v.Gender.toLowerCase() as "male" | "female" | "neutral",
        type: v.VoiceType.toLowerCase().includes("neural")
          ? "neural"
          : "standard",
        description: v.LocalName,
      }));

      const filteredVoices = languageCode
        ? voices.filter((v) => v.languageCode.startsWith(languageCode))
        : voices;

      if (!languageCode) {
        this.voicesCache = { voices, timestamp: Date.now() };
      }

      return filteredVoices;
    } catch (err) {
      logger.error("Failed to fetch Azure voices:", err);
      return [];
    }
  }

  async synthesize(text: string, options: TTSOptions): Promise<TTSResult> {
    if (!this.subscriptionKey) {
      throw new TTSError({
        code: TTS_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
        message: "Azure Speech key not configured. Set AZURE_SPEECH_KEY.",
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }

    const startTime = Date.now();
    const azureOptions = options as AzureTTSOptions;
    const voice = options.voice ?? "en-US-JennyNeural";
    const outputFormat = this.getOutputFormat(options.format ?? "mp3");

    // Build SSML
    const ssml = azureOptions.ssml ?? this.buildSSML(text, voice, options);

    try {
      const url = `https://${this.region}.tts.speech.microsoft.com/cognitiveservices/v1`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": this.subscriptionKey,
          "Content-Type": "application/ssml+xml",
          "X-Microsoft-OutputFormat": outputFormat,
        },
        body: ssml,
      });

      if (!response.ok) {
        throw new TTSError({
          code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
          message: `Azure TTS failed: ${response.status}`,
          category: ErrorCategory.EXECUTION,
          severity: ErrorSeverity.HIGH,
          retriable: response.status >= 500,
        });
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const latency = Date.now() - startTime;

      return {
        buffer,
        format: options.format ?? "mp3",
        size: buffer.length,
        voice,
        metadata: {
          latency,
          provider: "azure",
          region: this.region,
        },
      };
    } catch (err) {
      if (err instanceof TTSError) throw err;

      throw new TTSError({
        code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
        message: `Azure TTS failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        category: ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable: true,
        originalError: err instanceof Error ? err : undefined,
      });
    }
  }

  private buildSSML(text: string, voice: string, options: TTSOptions): string {
    const rate = options.speed
      ? `${Math.round(options.speed * 100)}%`
      : "default";
    const pitch = options.pitch
      ? `${options.pitch > 0 ? "+" : ""}${options.pitch}Hz`
      : "default";

    return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
      <voice name="${voice}">
        <prosody rate="${rate}" pitch="${pitch}">
          ${this.escapeXml(text)}
        </prosody>
      </voice>
    </speak>`;
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  private getOutputFormat(format: string): string {
    switch (format) {
      case "mp3":
        return "audio-24khz-160kbitrate-mono-mp3";
      case "wav":
        return "riff-24khz-16bit-mono-pcm";
      case "ogg":
        return "ogg-24khz-16bit-mono-opus";
      default:
        return "audio-24khz-160kbitrate-mono-mp3";
    }
  }
}
```

### 4. Sarvam TTS Handler (Indian Languages)

```typescript
// src/lib/adapters/tts/sarvamTTSHandler.ts

import type { TTSHandler } from "../../utils/ttsProcessor.js";
import type { TTSOptions, TTSResult, TTSVoice } from "../../types/ttsTypes.js";
import { TTSError, TTS_ERROR_CODES } from "../../utils/ttsProcessor.js";
import { ErrorCategory, ErrorSeverity } from "../../constants/enums.js";

/**
 * Sarvam AI supported Indian languages
 */
export type SarvamLanguage =
  | "hi-IN"
  | "bn-IN"
  | "ta-IN"
  | "te-IN"
  | "mr-IN"
  | "gu-IN"
  | "kn-IN"
  | "ml-IN"
  | "pa-IN"
  | "or-IN"
  | "en-IN";

/**
 * Sarvam AI Text-to-Speech Handler
 * Specialized for Indian languages
 *
 * @see https://docs.sarvam.ai/
 */
export class SarvamTTSHandler implements TTSHandler {
  private readonly apiKey: string | null;
  private readonly baseUrl = "https://api.sarvam.ai/v1";

  public readonly maxTextLength = 3000;

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env.SARVAM_API_KEY ?? null;
  }

  isConfigured(): boolean {
    return this.apiKey !== null;
  }

  async getVoices(languageCode?: string): Promise<TTSVoice[]> {
    // Sarvam provides predefined voices for each language
    const voices: TTSVoice[] = [
      {
        id: "sarvam-hi-female",
        name: "Hindi Female",
        languageCode: "hi-IN",
        languageCodes: ["hi-IN"],
        gender: "female",
        type: "neural",
      },
      {
        id: "sarvam-hi-male",
        name: "Hindi Male",
        languageCode: "hi-IN",
        languageCodes: ["hi-IN"],
        gender: "male",
        type: "neural",
      },
      {
        id: "sarvam-bn-female",
        name: "Bengali Female",
        languageCode: "bn-IN",
        languageCodes: ["bn-IN"],
        gender: "female",
        type: "neural",
      },
      {
        id: "sarvam-ta-female",
        name: "Tamil Female",
        languageCode: "ta-IN",
        languageCodes: ["ta-IN"],
        gender: "female",
        type: "neural",
      },
      {
        id: "sarvam-te-female",
        name: "Telugu Female",
        languageCode: "te-IN",
        languageCodes: ["te-IN"],
        gender: "female",
        type: "neural",
      },
      {
        id: "sarvam-mr-female",
        name: "Marathi Female",
        languageCode: "mr-IN",
        languageCodes: ["mr-IN"],
        gender: "female",
        type: "neural",
      },
      {
        id: "sarvam-kn-female",
        name: "Kannada Female",
        languageCode: "kn-IN",
        languageCodes: ["kn-IN"],
        gender: "female",
        type: "neural",
      },
      {
        id: "sarvam-ml-female",
        name: "Malayalam Female",
        languageCode: "ml-IN",
        languageCodes: ["ml-IN"],
        gender: "female",
        type: "neural",
      },
      {
        id: "sarvam-en-female",
        name: "Indian English Female",
        languageCode: "en-IN",
        languageCodes: ["en-IN"],
        gender: "female",
        type: "neural",
      },
    ];

    return languageCode
      ? voices.filter((v) => v.languageCode.startsWith(languageCode))
      : voices;
  }

  async synthesize(text: string, options: TTSOptions): Promise<TTSResult> {
    if (!this.apiKey) {
      throw new TTSError({
        code: TTS_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
        message: "Sarvam API key not configured. Set SARVAM_API_KEY.",
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }

    const startTime = Date.now();
    const voice = options.voice ?? "sarvam-hi-female";

    // Extract language from voice ID
    const languageMatch = voice.match(/sarvam-(\w{2})-/);
    const languageCode = languageMatch ? `${languageMatch[1]}-IN` : "hi-IN";

    try {
      const response = await fetch(`${this.baseUrl}/text-to-speech`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          language_code: languageCode,
          speaker: voice,
          model: "bulbul:v1", // Sarvam's TTS model
          pitch: options.pitch ?? 0,
          pace: options.speed ?? 1.0,
          loudness: options.volumeGainDb ?? 0,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new TTSError({
          code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
          message: `Sarvam TTS failed: ${response.status} - ${errorText}`,
          category: ErrorCategory.EXECUTION,
          severity: ErrorSeverity.HIGH,
          retriable: response.status >= 500,
        });
      }

      const data = (await response.json()) as { audio_content: string };
      const buffer = Buffer.from(data.audio_content, "base64");
      const latency = Date.now() - startTime;

      return {
        buffer,
        format: "wav", // Sarvam returns WAV by default
        size: buffer.length,
        voice,
        metadata: {
          latency,
          provider: "sarvam",
          languageCode,
        },
      };
    } catch (err) {
      if (err instanceof TTSError) throw err;

      throw new TTSError({
        code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
        message: `Sarvam TTS failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        category: ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable: true,
        originalError: err instanceof Error ? err : undefined,
      });
    }
  }
}
```

### 5. Additional TTS Handlers (Murf, Play.ai, Speechify)

```typescript
// src/lib/adapters/tts/murfTTSHandler.ts

/**
 * Murf.ai Text-to-Speech Handler
 * Professional AI voice-over
 *
 * @see https://murf.ai/api
 */
export class MurfTTSHandler implements TTSHandler {
  // Similar implementation pattern to ElevenLabs
  // API: https://api.murf.ai/v1
  // Voices: Extensive voice library with emotions
  // Features: Voice cloning, studio-quality output
}

// src/lib/adapters/tts/playaiTTSHandler.ts

/**
 * Play.ai Text-to-Speech Handler
 * Ultra-realistic voice synthesis
 *
 * @see https://play.ai/docs
 */
export class PlayaiTTSHandler implements TTSHandler {
  // Similar implementation pattern
  // API: https://api.play.ai/v1
  // Voices: Multi-language, emotional voices
  // Features: Voice cloning, streaming
}

// src/lib/adapters/tts/speechifyTTSHandler.ts

/**
 * Speechify Text-to-Speech Handler
 * Reading and accessibility focused
 *
 * @see https://speechify.com/api
 */
export class SpeechifyTTSHandler implements TTSHandler {
  // Similar implementation pattern
  // API: https://api.speechify.com/v1
  // Voices: Optimized for long-form reading
  // Features: Speed optimization, natural pauses
}
```

---

## Speech-to-Text (STT) Providers

### STT Types Definition

```typescript
// src/lib/types/sttTypes.ts

/**
 * Supported audio formats for STT input
 */
export type STTAudioFormat =
  | "wav"
  | "mp3"
  | "m4a"
  | "flac"
  | "ogg"
  | "webm"
  | "mp4"
  | "mpeg"
  | "mpga";

/**
 * STT configuration options
 */
export type STTOptions = {
  /** Audio language code (e.g., "en-US") */
  language?: string;
  /** Audio format hint */
  format?: STTAudioFormat;
  /** Enable speaker diarization */
  diarization?: boolean;
  /** Number of speakers (for diarization) */
  speakerCount?: number;
  /** Enable word-level timestamps */
  wordTimestamps?: boolean;
  /** Enable punctuation */
  punctuate?: boolean;
  /** Custom vocabulary/keywords */
  keywords?: string[];
  /** Model variant (provider-specific) */
  model?: string;
  /** Profanity filter */
  profanityFilter?: boolean;
  /** Provider-specific options */
  providerOptions?: Record<string, unknown>;
};

/**
 * Word-level transcription detail
 */
export type TranscriptionWord = {
  /** Transcribed word */
  word: string;
  /** Start time in seconds */
  start: number;
  /** End time in seconds */
  end: number;
  /** Confidence score (0-1) */
  confidence: number;
  /** Speaker ID (if diarization enabled) */
  speaker?: string;
};

/**
 * Transcription segment (sentence/phrase level)
 */
export type TranscriptionSegment = {
  /** Segment text */
  text: string;
  /** Start time in seconds */
  start: number;
  /** End time in seconds */
  end: number;
  /** Confidence score (0-1) */
  confidence: number;
  /** Speaker ID (if diarization enabled) */
  speaker?: string;
  /** Word-level details */
  words?: TranscriptionWord[];
  /** Is this segment final (for streaming) */
  isFinal?: boolean;
};

/**
 * Complete STT result
 */
export type STTResult = {
  /** Full transcribed text */
  text: string;
  /** Detected/specified language */
  language: string;
  /** Transcription segments */
  segments: TranscriptionSegment[];
  /** Audio duration in seconds */
  duration: number;
  /** Overall confidence score */
  confidence: number;
  /** Processing metadata */
  metadata: {
    /** Processing time in ms */
    latency: number;
    /** Provider used */
    provider: string;
    /** Model used */
    model?: string;
    /** Speaker count (if diarization) */
    speakerCount?: number;
    /** Additional provider metadata */
    [key: string]: unknown;
  };
};

/**
 * STT error codes
 */
export const STT_ERROR_CODES = {
  EMPTY_AUDIO: "STT_EMPTY_AUDIO",
  INVALID_FORMAT: "STT_INVALID_FORMAT",
  AUDIO_TOO_LONG: "STT_AUDIO_TOO_LONG",
  PROVIDER_NOT_SUPPORTED: "STT_PROVIDER_NOT_SUPPORTED",
  PROVIDER_NOT_CONFIGURED: "STT_PROVIDER_NOT_CONFIGURED",
  TRANSCRIPTION_FAILED: "STT_TRANSCRIPTION_FAILED",
  UNSUPPORTED_LANGUAGE: "STT_UNSUPPORTED_LANGUAGE",
} as const;
```

### 1. Deepgram STT Handler

```typescript
// src/lib/adapters/stt/deepgramSTTHandler.ts

import type {
  STTProvider,
  STTOptions,
  STTResult,
  TranscriptionSegment,
} from "../../types/sttTypes.js";
import { STTError, STT_ERROR_CODES } from "../../voice/errors.js";
import { ErrorCategory, ErrorSeverity } from "../../constants/enums.js";
import { logger } from "../../utils/logger.js";

/**
 * Deepgram model options
 */
export type DeepgramModel =
  | "nova-2" // Latest, most accurate
  | "nova-2-general" // General purpose
  | "nova-2-meeting" // Meeting transcription
  | "nova-2-phonecall" // Phone call optimization
  | "nova-2-medical" // Medical terminology
  | "whisper-large" // OpenAI Whisper hosted
  | "whisper-medium"
  | "enhanced" // Legacy enhanced
  | "base"; // Legacy base

/**
 * Deepgram-specific STT options
 */
export type DeepgramSTTOptions = STTOptions & {
  model?: DeepgramModel;
  /** Enable smart formatting */
  smartFormat?: boolean;
  /** Enable utterance detection */
  utterances?: boolean;
  /** Utterance split threshold (seconds) */
  uttSplit?: number;
  /** Enable topic detection */
  topics?: boolean;
  /** Enable sentiment analysis */
  sentiment?: boolean;
  /** Enable entity detection */
  detectEntities?: boolean;
  /** Enable summarization */
  summarize?: boolean;
};

/**
 * Deepgram Speech-to-Text Handler
 *
 * @see https://developers.deepgram.com/docs
 */
export class DeepgramSTTHandler implements STTProvider {
  readonly name = "deepgram";
  private readonly apiKey: string | null;
  private readonly baseUrl = "https://api.deepgram.com/v1";

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env.DEEPGRAM_API_KEY ?? null;
  }

  getCapabilities(): ("tts" | "stt" | "realtime" | "streaming")[] {
    return ["stt", "streaming"];
  }

  isConfigured(): boolean {
    return this.apiKey !== null;
  }

  async validateConfig(): Promise<{ valid: boolean; errors: string[] }> {
    if (!this.apiKey) {
      return { valid: false, errors: ["DEEPGRAM_API_KEY not configured"] };
    }

    // Test API key with a simple request
    try {
      const response = await fetch(`${this.baseUrl}/projects`, {
        headers: { Authorization: `Token ${this.apiKey}` },
      });
      return {
        valid: response.ok,
        errors: response.ok ? [] : ["Invalid API key"],
      };
    } catch {
      return { valid: false, errors: ["Network error validating API key"] };
    }
  }

  getSupportedFormats(): string[] {
    return ["wav", "mp3", "m4a", "flac", "ogg", "webm", "mp4"];
  }

  async getSupportedLanguages(): Promise<string[]> {
    // Deepgram supports 36+ languages
    return [
      "en",
      "en-US",
      "en-GB",
      "en-AU",
      "en-IN",
      "es",
      "es-ES",
      "es-419",
      "fr",
      "fr-FR",
      "fr-CA",
      "de",
      "de-DE",
      "it",
      "it-IT",
      "pt",
      "pt-BR",
      "pt-PT",
      "nl",
      "nl-NL",
      "hi",
      "hi-IN",
      "ja",
      "ja-JP",
      "ko",
      "ko-KR",
      "zh",
      "zh-CN",
      "zh-TW",
      "ru",
      "ru-RU",
      "ar",
      "tr",
      "tr-TR",
      "pl",
      "pl-PL",
      "uk",
      "uk-UA",
    ];
  }

  async transcribe(
    audio: Buffer | ArrayBuffer,
    options: STTOptions = {},
  ): Promise<STTResult> {
    if (!this.apiKey) {
      throw new STTError({
        code: STT_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
        message: "Deepgram API key not configured. Set DEEPGRAM_API_KEY.",
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }

    const startTime = Date.now();
    const buffer = Buffer.isBuffer(audio) ? audio : Buffer.from(audio);

    if (buffer.length === 0) {
      throw new STTError({
        code: STT_ERROR_CODES.EMPTY_AUDIO,
        message: "Audio input is empty",
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.MEDIUM,
        retriable: false,
      });
    }

    const dgOptions = options as DeepgramSTTOptions;
    const model = dgOptions.model ?? "nova-2";

    // Build query parameters
    const params = new URLSearchParams({
      model,
      punctuate: String(options.punctuate !== false),
      diarize: String(options.diarization === true),
      smart_format: String(dgOptions.smartFormat !== false),
      utterances: String(dgOptions.utterances === true),
    });

    if (options.language) {
      params.set("language", options.language);
    }
    if (options.speakerCount) {
      params.set("diarize_version", "3");
    }
    if (options.wordTimestamps !== false) {
      params.set("paragraphs", "true");
    }
    if (options.keywords?.length) {
      params.set("keywords", options.keywords.join(","));
    }
    if (dgOptions.sentiment) {
      params.set("sentiment", "true");
    }
    if (dgOptions.summarize) {
      params.set("summarize", "true");
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/listen?${params.toString()}`,
        {
          method: "POST",
          headers: {
            Authorization: `Token ${this.apiKey}`,
            "Content-Type": this.getContentType(options.format ?? "wav"),
          },
          body: buffer,
        },
      );

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as {
          err_msg?: string;
        };
        throw new STTError({
          code: STT_ERROR_CODES.TRANSCRIPTION_FAILED,
          message: `Deepgram transcription failed: ${response.status} - ${errorData.err_msg ?? "Unknown error"}`,
          category: ErrorCategory.EXECUTION,
          severity: ErrorSeverity.HIGH,
          retriable: response.status >= 500,
        });
      }

      const data = (await response.json()) as DeepgramResponse;
      const latency = Date.now() - startTime;

      return this.parseResponse(data, latency, model, options);
    } catch (err) {
      if (err instanceof STTError) throw err;

      throw new STTError({
        code: STT_ERROR_CODES.TRANSCRIPTION_FAILED,
        message: `Deepgram transcription failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        category: ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable: true,
        originalError: err instanceof Error ? err : undefined,
      });
    }
  }

  /**
   * Stream transcription for live audio input
   */
  async *transcribeStream(
    audioStream: AsyncIterable<Buffer>,
    options: STTOptions = {},
  ): AsyncIterable<TranscriptionSegment> {
    if (!this.apiKey) {
      throw new STTError({
        code: STT_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
        message: "Deepgram API key not configured",
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }

    // Deepgram WebSocket streaming
    const wsUrl = "wss://api.deepgram.com/v1/listen";
    const params = new URLSearchParams({
      model: (options as DeepgramSTTOptions).model ?? "nova-2",
      punctuate: "true",
      interim_results: "true",
      encoding: "linear16",
      sample_rate: "16000",
    });

    if (options.language) {
      params.set("language", options.language);
    }

    // Note: Full WebSocket implementation would require ws package
    // This is a simplified representation
    logger.info("Deepgram streaming transcription started", {
      model: params.get("model"),
      language: params.get("language"),
    });

    // In actual implementation, this would:
    // 1. Open WebSocket connection to Deepgram
    // 2. Send audio chunks from audioStream
    // 3. Yield TranscriptionSegments as they arrive
    // 4. Handle interim vs final results

    throw new Error(
      "WebSocket streaming not yet implemented - use transcribe() for now",
    );
  }

  private getContentType(format: string): string {
    const types: Record<string, string> = {
      wav: "audio/wav",
      mp3: "audio/mpeg",
      m4a: "audio/mp4",
      flac: "audio/flac",
      ogg: "audio/ogg",
      webm: "audio/webm",
    };
    return types[format] ?? "audio/wav";
  }

  private parseResponse(
    data: DeepgramResponse,
    latency: number,
    model: string,
    options: STTOptions,
  ): STTResult {
    const channel = data.results?.channels?.[0];
    const alternative = channel?.alternatives?.[0];

    if (!alternative) {
      return {
        text: "",
        language: options.language ?? "en",
        segments: [],
        duration: data.metadata?.duration ?? 0,
        confidence: 0,
        metadata: { latency, provider: "deepgram", model },
      };
    }

    const segments: TranscriptionSegment[] = [];

    // Parse paragraphs/utterances into segments
    if (alternative.paragraphs?.paragraphs) {
      for (const para of alternative.paragraphs.paragraphs) {
        for (const sentence of para.sentences) {
          segments.push({
            text: sentence.text,
            start: sentence.start,
            end: sentence.end,
            confidence: alternative.confidence,
            speaker: para.speaker ? String(para.speaker) : undefined,
            words: this.parseWords(
              alternative.words,
              sentence.start,
              sentence.end,
            ),
            isFinal: true,
          });
        }
      }
    } else if (alternative.words) {
      // Fallback: create single segment from words
      segments.push({
        text: alternative.transcript,
        start: alternative.words[0]?.start ?? 0,
        end: alternative.words[alternative.words.length - 1]?.end ?? 0,
        confidence: alternative.confidence,
        words: alternative.words.map((w) => ({
          word: w.word,
          start: w.start,
          end: w.end,
          confidence: w.confidence,
          speaker: w.speaker ? String(w.speaker) : undefined,
        })),
        isFinal: true,
      });
    }

    return {
      text: alternative.transcript,
      language: data.metadata?.detected_language ?? options.language ?? "en",
      segments,
      duration: data.metadata?.duration ?? 0,
      confidence: alternative.confidence,
      metadata: {
        latency,
        provider: "deepgram",
        model,
        speakerCount: data.metadata?.speakers?.length,
        channels: data.metadata?.channels,
      },
    };
  }

  private parseWords(
    words: DeepgramWord[] | undefined,
    start: number,
    end: number,
  ): TranscriptionWord[] {
    if (!words) return [];
    return words
      .filter((w) => w.start >= start && w.end <= end)
      .map((w) => ({
        word: w.word,
        start: w.start,
        end: w.end,
        confidence: w.confidence,
        speaker: w.speaker ? String(w.speaker) : undefined,
      }));
  }
}

// Deepgram API response types
type DeepgramResponse = {
  metadata?: {
    duration?: number;
    channels?: number;
    detected_language?: string;
    speakers?: Array<{ speaker: number }>;
  };
  results?: {
    channels?: Array<{
      alternatives?: Array<{
        transcript: string;
        confidence: number;
        words?: DeepgramWord[];
        paragraphs?: {
          paragraphs: Array<{
            speaker?: number;
            sentences: Array<{
              text: string;
              start: number;
              end: number;
            }>;
          }>;
        };
      }>;
    }>;
  };
};

type DeepgramWord = {
  word: string;
  start: number;
  end: number;
  confidence: number;
  speaker?: number;
  punctuated_word?: string;
};
```

### 2. OpenAI Whisper STT Handler

```typescript
// src/lib/adapters/stt/whisperSTTHandler.ts

import type {
  STTProvider,
  STTOptions,
  STTResult,
  TranscriptionSegment,
} from "../../types/sttTypes.js";
import { STTError, STT_ERROR_CODES } from "../../voice/errors.js";
import { ErrorCategory, ErrorSeverity } from "../../constants/enums.js";

/**
 * Whisper model options
 */
export type WhisperModel = "whisper-1";

/**
 * Whisper response format
 */
export type WhisperResponseFormat =
  | "json"
  | "text"
  | "srt"
  | "verbose_json"
  | "vtt";

/**
 * Whisper-specific STT options
 */
export type WhisperSTTOptions = STTOptions & {
  /** Response format */
  responseFormat?: WhisperResponseFormat;
  /** Temperature for sampling (0-1) */
  temperature?: number;
  /** Prompt to guide transcription style */
  prompt?: string;
};

/**
 * OpenAI Whisper Speech-to-Text Handler
 *
 * @see https://platform.openai.com/docs/api-reference/audio
 */
export class WhisperSTTHandler implements STTProvider {
  readonly name = "whisper";
  private readonly apiKey: string | null;
  private readonly baseUrl = "https://api.openai.com/v1";

  /**
   * Whisper max file size: 25 MB
   */
  private static readonly MAX_FILE_SIZE = 25 * 1024 * 1024;

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env.OPENAI_API_KEY ?? null;
  }

  getCapabilities(): ("tts" | "stt" | "realtime" | "streaming")[] {
    return ["stt"];
  }

  isConfigured(): boolean {
    return this.apiKey !== null;
  }

  async validateConfig(): Promise<{ valid: boolean; errors: string[] }> {
    if (!this.apiKey) {
      return { valid: false, errors: ["OPENAI_API_KEY not configured"] };
    }
    return { valid: true, errors: [] };
  }

  getSupportedFormats(): string[] {
    return [
      "flac",
      "m4a",
      "mp3",
      "mp4",
      "mpeg",
      "mpga",
      "oga",
      "ogg",
      "wav",
      "webm",
    ];
  }

  async getSupportedLanguages(): Promise<string[]> {
    // Whisper supports 97+ languages
    return [
      "en",
      "zh",
      "de",
      "es",
      "ru",
      "ko",
      "fr",
      "ja",
      "pt",
      "tr",
      "pl",
      "ca",
      "nl",
      "ar",
      "sv",
      "it",
      "id",
      "hi",
      "fi",
      "vi",
      "he",
      "uk",
      "el",
      "ms",
      "cs",
      "ro",
      "da",
      "hu",
      "ta",
      "no",
      "th",
      "ur",
      "hr",
      "bg",
      "lt",
      "la",
      "mi",
      "ml",
      "cy",
      "sk",
      "te",
      "fa",
      "lv",
      "bn",
      "sr",
      "az",
      "sl",
      "kn",
      "et",
      "mk",
      // ... and many more
    ];
  }

  async transcribe(
    audio: Buffer | ArrayBuffer,
    options: STTOptions = {},
  ): Promise<STTResult> {
    if (!this.apiKey) {
      throw new STTError({
        code: STT_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
        message: "OpenAI API key not configured. Set OPENAI_API_KEY.",
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }

    const buffer = Buffer.isBuffer(audio) ? audio : Buffer.from(audio);

    if (buffer.length === 0) {
      throw new STTError({
        code: STT_ERROR_CODES.EMPTY_AUDIO,
        message: "Audio input is empty",
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.MEDIUM,
        retriable: false,
      });
    }

    if (buffer.length > WhisperSTTHandler.MAX_FILE_SIZE) {
      throw new STTError({
        code: STT_ERROR_CODES.AUDIO_TOO_LONG,
        message: `Audio file exceeds maximum size of ${WhisperSTTHandler.MAX_FILE_SIZE} bytes`,
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.MEDIUM,
        retriable: false,
      });
    }

    const startTime = Date.now();
    const whisperOptions = options as WhisperSTTOptions;
    const responseFormat = whisperOptions.responseFormat ?? "verbose_json";

    try {
      // Create form data
      const formData = new FormData();
      const blob = new Blob([buffer], {
        type: this.getMimeType(options.format ?? "mp3"),
      });
      formData.append("file", blob, `audio.${options.format ?? "mp3"}`);
      formData.append("model", "whisper-1");
      formData.append("response_format", responseFormat);

      if (options.language) {
        formData.append("language", options.language);
      }
      if (whisperOptions.temperature !== undefined) {
        formData.append("temperature", String(whisperOptions.temperature));
      }
      if (whisperOptions.prompt) {
        formData.append("prompt", whisperOptions.prompt);
      }
      if (
        options.wordTimestamps !== false &&
        responseFormat === "verbose_json"
      ) {
        formData.append("timestamp_granularities[]", "word");
        formData.append("timestamp_granularities[]", "segment");
      }

      const response = await fetch(`${this.baseUrl}/audio/transcriptions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        throw new STTError({
          code: STT_ERROR_CODES.TRANSCRIPTION_FAILED,
          message: `Whisper transcription failed: ${response.status} - ${errorData.error?.message ?? "Unknown error"}`,
          category: ErrorCategory.EXECUTION,
          severity: ErrorSeverity.HIGH,
          retriable: response.status >= 500,
        });
      }

      const data = (await response.json()) as WhisperResponse;
      const latency = Date.now() - startTime;

      return this.parseResponse(data, latency, options);
    } catch (err) {
      if (err instanceof STTError) throw err;

      throw new STTError({
        code: STT_ERROR_CODES.TRANSCRIPTION_FAILED,
        message: `Whisper transcription failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        category: ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable: true,
        originalError: err instanceof Error ? err : undefined,
      });
    }
  }

  private getMimeType(format: string): string {
    const types: Record<string, string> = {
      mp3: "audio/mpeg",
      mp4: "audio/mp4",
      m4a: "audio/mp4",
      wav: "audio/wav",
      flac: "audio/flac",
      ogg: "audio/ogg",
      webm: "audio/webm",
    };
    return types[format] ?? "audio/mpeg";
  }

  private parseResponse(
    data: WhisperResponse,
    latency: number,
    options: STTOptions,
  ): STTResult {
    const segments: TranscriptionSegment[] = (data.segments ?? []).map(
      (seg) => ({
        text: seg.text.trim(),
        start: seg.start,
        end: seg.end,
        confidence: seg.avg_logprob ? Math.exp(seg.avg_logprob) : 0.9,
        words: seg.words?.map((w) => ({
          word: w.word,
          start: w.start,
          end: w.end,
          confidence: 0.9, // Whisper doesn't provide word-level confidence
        })),
        isFinal: true,
      }),
    );

    return {
      text: data.text,
      language: data.language ?? options.language ?? "en",
      segments,
      duration: data.duration ?? 0,
      confidence:
        segments.length > 0
          ? segments.reduce((sum, s) => sum + s.confidence, 0) / segments.length
          : 0.9,
      metadata: {
        latency,
        provider: "whisper",
        model: "whisper-1",
      },
    };
  }
}

type WhisperResponse = {
  text: string;
  language?: string;
  duration?: number;
  segments?: Array<{
    text: string;
    start: number;
    end: number;
    avg_logprob?: number;
    words?: Array<{
      word: string;
      start: number;
      end: number;
    }>;
  }>;
};
```

### 3. Gladia STT Handler

```typescript
// src/lib/adapters/stt/gladiaSTTHandler.ts

/**
 * Gladia Speech-to-Text Handler
 * Advanced transcription with summarization and translation
 *
 * @see https://docs.gladia.io/
 */
export class GladiaSTTHandler implements STTProvider {
  readonly name = "gladia";
  private readonly apiKey: string | null;
  private readonly baseUrl = "https://api.gladia.io/v2";

  // Similar implementation pattern to Deepgram
  // Key features:
  // - Real-time streaming via WebSocket
  // - Speaker diarization
  // - Summarization
  // - Translation
  // - Custom vocabulary
}
```

---

## Realtime Voice

### Realtime Types Definition

```typescript
// src/lib/types/realtimeTypes.ts

/**
 * Realtime session configuration
 */
export type RealtimeConfig = {
  /** Model to use */
  model?: string;
  /** Voice for responses */
  voice?: string;
  /** Input audio format */
  inputFormat?: {
    encoding: "pcm16" | "g711_ulaw" | "g711_alaw";
    sampleRate: number;
    channels: 1 | 2;
  };
  /** Output audio format */
  outputFormat?: {
    encoding: "pcm16" | "g711_ulaw" | "g711_alaw";
    sampleRate: number;
  };
  /** System instructions */
  instructions?: string;
  /** Turn detection mode */
  turnDetection?: "server_vad" | "none";
  /** VAD threshold (0-1) */
  vadThreshold?: number;
  /** Enable input audio transcription */
  transcribeInput?: boolean;
  /** Provider-specific options */
  providerOptions?: Record<string, unknown>;
};

/**
 * Realtime session event types
 */
export type RealtimeEventType =
  | "session.created"
  | "session.updated"
  | "input_audio_buffer.append"
  | "input_audio_buffer.commit"
  | "input_audio_buffer.clear"
  | "response.create"
  | "response.audio.delta"
  | "response.audio.done"
  | "response.text.delta"
  | "response.text.done"
  | "response.function_call.arguments.delta"
  | "response.function_call.arguments.done"
  | "response.done"
  | "conversation.item.created"
  | "conversation.item.deleted"
  | "error";

/**
 * Realtime session event
 */
export type RealtimeEvent = {
  type: RealtimeEventType;
  eventId?: string;
  timestamp?: number;
  data?: unknown;
};

/**
 * Audio event from realtime session
 */
export type RealtimeAudioEvent = RealtimeEvent & {
  type: "response.audio.delta" | "response.audio.done";
  data: {
    /** Base64 encoded audio chunk */
    audio?: string;
    /** Audio item ID */
    itemId?: string;
    /** Content index */
    contentIndex?: number;
  };
};

/**
 * Text event from realtime session
 */
export type RealtimeTextEvent = RealtimeEvent & {
  type: "response.text.delta" | "response.text.done";
  data: {
    /** Text content */
    text: string;
    /** Item ID */
    itemId?: string;
  };
};

/**
 * Realtime session type
 */
export type RealtimeSession = {
  /** Session ID */
  id: string;

  /** Send audio input */
  sendAudio(audio: Buffer | ArrayBuffer): void;

  /** Commit input audio buffer */
  commitAudio(): void;

  /** Clear input audio buffer */
  clearAudio(): void;

  /** Send text input */
  sendText(text: string): void;

  /** Create a response */
  createResponse(): void;

  /** Cancel current response */
  cancelResponse(): void;

  /** Update session configuration */
  updateSession(config: Partial<RealtimeConfig>): void;

  /** Add event listener */
  on(event: RealtimeEventType, handler: (event: RealtimeEvent) => void): void;

  /** Remove event listener */
  off(event: RealtimeEventType, handler: (event: RealtimeEvent) => void): void;

  /** Close session */
  close(): void;

  /** Check if session is open */
  isOpen(): boolean;
};
```

### OpenAI Realtime Handler

```typescript
// src/lib/adapters/realtime/openaiRealtimeHandler.ts

import type {
  RealtimeVoiceProvider,
  RealtimeConfig,
  RealtimeSession,
  RealtimeEvent,
  RealtimeEventType,
} from "../../types/realtimeTypes.js";
import { VoiceError, VOICE_ERROR_CODES } from "../../voice/errors.js";
import { ErrorCategory, ErrorSeverity } from "../../constants/enums.js";
import { logger } from "../../utils/logger.js";

/**
 * OpenAI Realtime voice identifiers
 */
export type OpenAIRealtimeVoice =
  | "alloy"
  | "echo"
  | "shimmer"
  | "ash"
  | "ballad"
  | "coral"
  | "sage"
  | "verse";

/**
 * OpenAI Realtime-specific configuration
 */
export type OpenAIRealtimeConfig = RealtimeConfig & {
  voice?: OpenAIRealtimeVoice;
  model?: "gpt-4o-realtime-preview" | "gpt-4o-realtime-preview-2024-10-01";
  /** Maximum response output tokens */
  maxResponseOutputTokens?: number | "inf";
  /** Temperature for responses */
  temperature?: number;
  /** Tools/functions for the session */
  tools?: Array<{
    type: "function";
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  }>;
};

/**
 * OpenAI Realtime API Handler
 *
 * @see https://platform.openai.com/docs/api-reference/realtime
 */
export class OpenAIRealtimeHandler implements RealtimeVoiceProvider {
  readonly name = "openai-realtime";
  private readonly apiKey: string | null;
  private session: OpenAIRealtimeSession | null = null;
  private config: RealtimeConfig | null = null;

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env.OPENAI_API_KEY ?? null;
  }

  getCapabilities(): ("tts" | "stt" | "realtime" | "streaming")[] {
    return ["realtime", "streaming"];
  }

  isConfigured(): boolean {
    return this.apiKey !== null;
  }

  async validateConfig(): Promise<{ valid: boolean; errors: string[] }> {
    if (!this.apiKey) {
      return { valid: false, errors: ["OPENAI_API_KEY not configured"] };
    }
    return { valid: true, errors: [] };
  }

  isConnected(): boolean {
    return this.session?.isOpen() ?? false;
  }

  getSessionConfig(): RealtimeConfig | null {
    return this.config;
  }

  async connect(config: RealtimeConfig): Promise<RealtimeSession> {
    if (!this.apiKey) {
      throw new VoiceError({
        code: VOICE_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
        message: "OpenAI API key not configured",
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }

    const rtConfig = config as OpenAIRealtimeConfig;
    const model = rtConfig.model ?? "gpt-4o-realtime-preview";

    // WebSocket URL for realtime API
    const wsUrl = `wss://api.openai.com/v1/realtime?model=${model}`;

    try {
      const ws = new WebSocket(wsUrl, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "OpenAI-Beta": "realtime=v1",
        },
      } as unknown as string[]);

      this.session = new OpenAIRealtimeSession(ws, rtConfig);
      this.config = config;

      // Wait for connection
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Connection timeout"));
        }, 10000);

        ws.addEventListener("open", () => {
          clearTimeout(timeout);
          resolve();
        });

        ws.addEventListener("error", (event) => {
          clearTimeout(timeout);
          reject(new Error(`WebSocket error: ${event}`));
        });
      });

      // Send session configuration
      this.session.updateSession({
        instructions: config.instructions,
        voice: rtConfig.voice ?? "alloy",
        input_audio_format: config.inputFormat?.encoding ?? "pcm16",
        output_audio_format: config.outputFormat?.encoding ?? "pcm16",
        turn_detection:
          config.turnDetection === "server_vad"
            ? { type: "server_vad", threshold: config.vadThreshold ?? 0.5 }
            : null,
        tools: rtConfig.tools,
        temperature: rtConfig.temperature ?? 0.8,
        max_response_output_tokens: rtConfig.maxResponseOutputTokens ?? "inf",
      });

      logger.info("OpenAI Realtime session connected", { model });
      return this.session;
    } catch (err) {
      throw new VoiceError({
        code: VOICE_ERROR_CODES.CONNECTION_FAILED,
        message: `Failed to connect to OpenAI Realtime: ${err instanceof Error ? err.message : "Unknown error"}`,
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.HIGH,
        retriable: true,
        originalError: err instanceof Error ? err : undefined,
      });
    }
  }

  async disconnect(): Promise<void> {
    if (this.session) {
      this.session.close();
      this.session = null;
      this.config = null;
    }
  }
}

/**
 * OpenAI Realtime session implementation
 */
class OpenAIRealtimeSession implements RealtimeSession {
  readonly id: string;
  private readonly ws: WebSocket;
  private readonly config: OpenAIRealtimeConfig;
  private readonly eventHandlers = new Map<
    RealtimeEventType,
    Set<(event: RealtimeEvent) => void>
  >();

  constructor(ws: WebSocket, config: OpenAIRealtimeConfig) {
    this.id = `session_${Date.now()}`;
    this.ws = ws;
    this.config = config;

    // Set up message handler
    ws.addEventListener("message", (event) => {
      try {
        const data = JSON.parse(event.data as string) as RealtimeEvent;
        this.emit(data.type, data);
      } catch (err) {
        logger.error("Failed to parse realtime message:", err);
      }
    });

    ws.addEventListener("close", () => {
      logger.info("OpenAI Realtime session closed");
    });
  }

  sendAudio(audio: Buffer | ArrayBuffer): void {
    const base64 = Buffer.isBuffer(audio)
      ? audio.toString("base64")
      : Buffer.from(audio).toString("base64");

    this.send({
      type: "input_audio_buffer.append",
      audio: base64,
    });
  }

  commitAudio(): void {
    this.send({ type: "input_audio_buffer.commit" });
  }

  clearAudio(): void {
    this.send({ type: "input_audio_buffer.clear" });
  }

  sendText(text: string): void {
    this.send({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text }],
      },
    });
  }

  createResponse(): void {
    this.send({ type: "response.create" });
  }

  cancelResponse(): void {
    this.send({ type: "response.cancel" });
  }

  updateSession(config: Record<string, unknown>): void {
    this.send({
      type: "session.update",
      session: config,
    });
  }

  on(event: RealtimeEventType, handler: (event: RealtimeEvent) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  off(event: RealtimeEventType, handler: (event: RealtimeEvent) => void): void {
    this.eventHandlers.get(event)?.delete(handler);
  }

  close(): void {
    this.ws.close();
  }

  isOpen(): boolean {
    return this.ws.readyState === WebSocket.OPEN;
  }

  private send(data: Record<string, unknown>): void {
    if (this.isOpen()) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private emit(type: RealtimeEventType, event: RealtimeEvent): void {
    const handlers = this.eventHandlers.get(type);
    if (handlers) {
      handlers.forEach((handler) => handler(event));
    }
  }
}
```

### Gemini Live Handler

The Google Gemini Live API is already partially implemented in `src/lib/providers/googleAiStudio.ts` in the `executeAudioStreamViaGeminiLive` method. This can be extracted into a dedicated realtime handler:

```typescript
// src/lib/adapters/realtime/geminiLiveHandler.ts

/**
 * Google Gemini Live API Handler
 *
 * Bidirectional audio streaming for real-time conversations.
 * Based on existing implementation in GoogleAIStudioProvider.
 *
 * @see https://ai.google.dev/gemini-api/docs/live-api
 */
export class GeminiLiveHandler implements RealtimeVoiceProvider {
  readonly name = "gemini-live";

  // Implementation follows the pattern in googleAiStudio.ts
  // Uses @google/genai client.live.connect()
  // Supports: audio in/out, text in/out, function calling
}
```

---

## Composite Voice

### Composite Voice Implementation

````typescript
// src/lib/voice/compositeVoice.ts

import type {
  TTSProvider,
  STTProvider,
  TTSStreamChunk,
} from "./voiceProviderInterface.js";
import type { TTSOptions, TTSResult } from "../types/ttsTypes.js";
import type {
  STTOptions,
  STTResult,
  TranscriptionSegment,
} from "../types/sttTypes.js";
import { VoiceError, VOICE_ERROR_CODES } from "./errors.js";
import { logger } from "../utils/logger.js";

/**
 * Composite voice configuration
 */
export type CompositeVoiceConfig = {
  /** TTS provider instance */
  ttsProvider: TTSProvider;
  /** STT provider instance */
  sttProvider: STTProvider;
  /** Default TTS options */
  defaultTTSOptions?: Partial<TTSOptions>;
  /** Default STT options */
  defaultSTTOptions?: Partial<STTOptions>;
};

/**
 * Voice conversation turn
 */
export type VoiceTurn = {
  role: "user" | "assistant";
  text: string;
  audio?: Buffer;
  timestamp: Date;
};

/**
 * Composite Voice - Combined TTS + STT for full voice conversations
 *
 * Enables building voice-based AI agents that can:
 * 1. Listen to user audio (STT)
 * 2. Process with AI
 * 3. Respond with voice (TTS)
 *
 * @example
 * ```typescript
 * const voice = new CompositeVoice({
 *   ttsProvider: new ElevenLabsTTSHandler(),
 *   sttProvider: new DeepgramSTTHandler(),
 * });
 *
 * // Transcribe user audio
 * const userText = await voice.listen(audioBuffer);
 *
 * // Get AI response
 * const aiResponse = await neurolink.generate({ input: { text: userText.text } });
 *
 * // Convert response to speech
 * const audioResponse = await voice.speak(aiResponse.content);
 * ```
 */
export class CompositeVoice {
  private readonly ttsProvider: TTSProvider;
  private readonly sttProvider: STTProvider;
  private readonly defaultTTSOptions: Partial<TTSOptions>;
  private readonly defaultSTTOptions: Partial<STTOptions>;
  private conversationHistory: VoiceTurn[] = [];

  constructor(config: CompositeVoiceConfig) {
    this.ttsProvider = config.ttsProvider;
    this.sttProvider = config.sttProvider;
    this.defaultTTSOptions = config.defaultTTSOptions ?? {};
    this.defaultSTTOptions = config.defaultSTTOptions ?? {};

    // Validate configuration
    if (!this.ttsProvider.isConfigured()) {
      logger.warn("CompositeVoice: TTS provider not configured");
    }
    if (!this.sttProvider.isConfigured()) {
      logger.warn("CompositeVoice: STT provider not configured");
    }
  }

  /**
   * Convert audio to text (Speech-to-Text)
   */
  async listen(
    audio: Buffer | ArrayBuffer,
    options?: STTOptions,
  ): Promise<STTResult> {
    const mergedOptions = { ...this.defaultSTTOptions, ...options };
    const result = await this.sttProvider.transcribe(audio, mergedOptions);

    // Add to conversation history
    this.conversationHistory.push({
      role: "user",
      text: result.text,
      timestamp: new Date(),
    });

    return result;
  }

  /**
   * Stream audio transcription
   */
  async *listenStream(
    audioStream: AsyncIterable<Buffer>,
    options?: STTOptions,
  ): AsyncIterable<TranscriptionSegment> {
    if (!this.sttProvider.transcribeStream) {
      throw new VoiceError({
        code: VOICE_ERROR_CODES.FEATURE_NOT_SUPPORTED,
        message: "STT provider does not support streaming",
        retriable: false,
      });
    }

    const mergedOptions = { ...this.defaultSTTOptions, ...options };
    yield* this.sttProvider.transcribeStream(audioStream, mergedOptions);
  }

  /**
   * Convert text to speech (Text-to-Speech)
   */
  async speak(text: string, options?: TTSOptions): Promise<TTSResult> {
    const mergedOptions = { ...this.defaultTTSOptions, ...options };
    const result = await this.ttsProvider.synthesize(text, mergedOptions);

    // Add to conversation history
    this.conversationHistory.push({
      role: "assistant",
      text,
      audio: result.buffer,
      timestamp: new Date(),
    });

    return result;
  }

  /**
   * Stream synthesized audio
   */
  async *speakStream(
    text: string,
    options?: TTSOptions,
  ): AsyncIterable<TTSStreamChunk> {
    if (!this.ttsProvider.synthesizeStream) {
      throw new VoiceError({
        code: VOICE_ERROR_CODES.FEATURE_NOT_SUPPORTED,
        message: "TTS provider does not support streaming",
        retriable: false,
      });
    }

    const mergedOptions = { ...this.defaultTTSOptions, ...options };
    yield* this.ttsProvider.synthesizeStream(text, mergedOptions);
  }

  /**
   * Full conversation turn: listen -> process -> speak
   */
  async converse(
    userAudio: Buffer | ArrayBuffer,
    processor: (text: string) => Promise<string>,
    options?: {
      sttOptions?: STTOptions;
      ttsOptions?: TTSOptions;
    },
  ): Promise<{
    userText: string;
    assistantText: string;
    assistantAudio: TTSResult;
    transcription: STTResult;
  }> {
    // 1. Transcribe user audio
    const transcription = await this.listen(userAudio, options?.sttOptions);

    // 2. Process with AI/logic
    const assistantText = await processor(transcription.text);

    // 3. Convert response to speech
    const assistantAudio = await this.speak(assistantText, options?.ttsOptions);

    return {
      userText: transcription.text,
      assistantText,
      assistantAudio,
      transcription,
    };
  }

  /**
   * Get conversation history
   */
  getHistory(): VoiceTurn[] {
    return [...this.conversationHistory];
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * Get available TTS voices
   */
  async getVoices(languageCode?: string) {
    return this.ttsProvider.getVoices(languageCode);
  }

  /**
   * Get supported STT languages
   */
  async getLanguages() {
    return this.sttProvider.getSupportedLanguages();
  }

  /**
   * Check if both providers are configured
   */
  isFullyConfigured(): boolean {
    return this.ttsProvider.isConfigured() && this.sttProvider.isConfigured();
  }
}
````

---

## TypeScript Types and Interfaces

### Complete Voice Types Module

```typescript
// src/lib/types/voiceTypes.ts

// Re-export all voice-related types
export * from "./ttsTypes.js";
export * from "./sttTypes.js";
export * from "./realtimeTypes.js";

/**
 * Voice provider name union type
 */
export type VoiceProviderName =
  // TTS providers
  | "google-tts"
  | "elevenlabs"
  | "openai-tts"
  | "azure-tts"
  | "sarvam"
  | "murf"
  | "playai"
  | "speechify"
  // STT providers
  | "deepgram"
  | "gladia"
  | "whisper"
  | "google-stt"
  | "azure-stt"
  // Realtime providers
  | "openai-realtime"
  | "gemini-live";

/**
 * Voice operation result union
 */
export type VoiceResult = TTSResult | STTResult;

/**
 * Voice configuration by provider
 */
export type VoiceProviderConfig<T extends VoiceProviderName> =
  T extends "elevenlabs"
    ? ElevenLabsTTSOptions
    : T extends "openai-tts"
      ? OpenAITTSOptions
      : T extends "azure-tts"
        ? AzureTTSOptions
        : T extends "deepgram"
          ? DeepgramSTTOptions
          : T extends "whisper"
            ? WhisperSTTOptions
            : T extends "openai-realtime"
              ? OpenAIRealtimeConfig
              : T extends "gemini-live"
                ? GeminiLiveConfig
                : TTSOptions | STTOptions;

/**
 * Voice event types for event-driven architectures
 */
export type VoiceEventType =
  | "synthesis.started"
  | "synthesis.progress"
  | "synthesis.completed"
  | "synthesis.error"
  | "transcription.started"
  | "transcription.partial"
  | "transcription.completed"
  | "transcription.error"
  | "realtime.connected"
  | "realtime.audio.received"
  | "realtime.text.received"
  | "realtime.disconnected"
  | "realtime.error";

/**
 * Voice event type
 */
export type VoiceEvent<T = unknown> = {
  type: VoiceEventType;
  timestamp: Date;
  provider: VoiceProviderName;
  data: T;
  metadata?: Record<string, unknown>;
};
```

---

## Integration with NeuroLink Agents

### Voice-Enabled Agent Extension

````typescript
// src/lib/voice/voiceAgent.ts

import type { NeuroLink } from "../neurolink.js";
import type { CompositeVoice } from "./compositeVoice.js";
import type {
  RealtimeSession,
  RealtimeConfig,
} from "../types/realtimeTypes.js";
import type { TextGenerationOptions } from "../types/generateTypes.js";
import { logger } from "../utils/logger.js";

/**
 * Voice agent configuration
 */
export type VoiceAgentConfig = {
  /** NeuroLink SDK instance */
  neurolink: NeuroLink;
  /** Composite voice instance */
  voice?: CompositeVoice;
  /** Realtime session (for live conversations) */
  realtimeSession?: RealtimeSession;
  /** System prompt for voice interactions */
  systemPrompt?: string;
  /** Voice interaction settings */
  voiceSettings?: {
    /** Voice ID for responses */
    voiceId?: string;
    /** Language code */
    language?: string;
    /** Speaking rate */
    speed?: number;
  };
};

/**
 * Voice-enabled NeuroLink Agent
 *
 * Extends NeuroLink SDK capabilities with voice input/output.
 *
 * @example Basic voice conversation
 * ```typescript
 * const agent = new VoiceAgent({
 *   neurolink: new NeuroLink(),
 *   voice: new CompositeVoice({
 *     ttsProvider: new ElevenLabsTTSHandler(),
 *     sttProvider: new DeepgramSTTHandler(),
 *   }),
 *   systemPrompt: "You are a helpful voice assistant.",
 * });
 *
 * // Process voice input
 * const response = await agent.processVoice(audioBuffer);
 * // response.audio contains the spoken response
 * ```
 *
 * @example Realtime conversation
 * ```typescript
 * const session = await openaiRealtime.connect({
 *   voice: "alloy",
 *   instructions: "You are a helpful assistant.",
 * });
 *
 * const agent = new VoiceAgent({
 *   neurolink: new NeuroLink(),
 *   realtimeSession: session,
 * });
 *
 * // Stream audio to agent
 * agent.streamAudio(audioChunk);
 *
 * // Listen for responses
 * agent.onAudioResponse((audio) => playAudio(audio));
 * ```
 */
export class VoiceAgent {
  private readonly neurolink: NeuroLink;
  private readonly voice?: CompositeVoice;
  private readonly realtimeSession?: RealtimeSession;
  private readonly systemPrompt: string;
  private readonly voiceSettings: Required<VoiceAgentConfig>["voiceSettings"];
  private conversationHistory: Array<{ role: string; content: string }> = [];

  constructor(config: VoiceAgentConfig) {
    this.neurolink = config.neurolink;
    this.voice = config.voice;
    this.realtimeSession = config.realtimeSession;
    this.systemPrompt =
      config.systemPrompt ?? "You are a helpful voice assistant.";
    this.voiceSettings = config.voiceSettings ?? {};

    if (this.realtimeSession) {
      this.setupRealtimeHandlers();
    }
  }

  /**
   * Process voice input and return voice response
   * Uses CompositeVoice for STT -> AI -> TTS pipeline
   */
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
  }> {
    if (!this.voice) {
      throw new Error("CompositeVoice not configured for this agent");
    }

    const startTime = Date.now();

    // 1. Transcribe audio to text
    const transcribeStart = Date.now();
    const transcription = await this.voice.listen(audio);
    const transcribeTime = Date.now() - transcribeStart;

    // 2. Add to conversation history
    this.conversationHistory.push({
      role: "user",
      content: transcription.text,
    });

    // 3. Generate AI response
    const generateStart = Date.now();
    const result = await this.neurolink.generate({
      prompt: transcription.text,
      systemPrompt: this.systemPrompt,
      ...options?.generateOptions,
    });
    const generateTime = Date.now() - generateStart;

    const assistantText = result?.content ?? "";

    // 4. Add assistant response to history
    this.conversationHistory.push({
      role: "assistant",
      content: assistantText,
    });

    // 5. Synthesize response to audio
    const synthesizeStart = Date.now();
    const ttsResult = await this.voice.speak(assistantText, {
      voice: options?.ttsVoice ?? this.voiceSettings.voiceId,
      speed: this.voiceSettings.speed,
    });
    const synthesizeTime = Date.now() - synthesizeStart;

    return {
      userText: transcription.text,
      assistantText,
      audio: ttsResult.buffer,
      metadata: {
        transcriptionTime: transcribeTime,
        generationTime: generateTime,
        synthesisTime: synthesizeTime,
        totalTime: Date.now() - startTime,
      },
    };
  }

  /**
   * Stream audio to realtime session
   */
  streamAudio(audio: Buffer | ArrayBuffer): void {
    if (!this.realtimeSession) {
      throw new Error("Realtime session not configured for this agent");
    }
    this.realtimeSession.sendAudio(audio);
  }

  /**
   * Send text to realtime session
   */
  sendText(text: string): void {
    if (!this.realtimeSession) {
      throw new Error("Realtime session not configured for this agent");
    }
    this.realtimeSession.sendText(text);
  }

  /**
   * Commit audio buffer and trigger response
   */
  commitAndRespond(): void {
    if (!this.realtimeSession) {
      throw new Error("Realtime session not configured for this agent");
    }
    this.realtimeSession.commitAudio();
    this.realtimeSession.createResponse();
  }

  /**
   * Register handler for audio responses
   */
  onAudioResponse(handler: (audio: Buffer) => void): void {
    if (!this.realtimeSession) {
      throw new Error("Realtime session not configured");
    }
    this.realtimeSession.on("response.audio.delta", (event) => {
      const audioData = (event.data as { audio?: string })?.audio;
      if (audioData) {
        handler(Buffer.from(audioData, "base64"));
      }
    });
  }

  /**
   * Register handler for text responses
   */
  onTextResponse(handler: (text: string) => void): void {
    if (!this.realtimeSession) {
      throw new Error("Realtime session not configured");
    }
    this.realtimeSession.on("response.text.delta", (event) => {
      const text = (event.data as { text?: string })?.text;
      if (text) {
        handler(text);
      }
    });
  }

  /**
   * Get conversation history
   */
  getHistory(): Array<{ role: string; content: string }> {
    return [...this.conversationHistory];
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * Close the agent (disconnect realtime if connected)
   */
  async close(): Promise<void> {
    if (this.realtimeSession?.isOpen()) {
      this.realtimeSession.close();
    }
  }

  private setupRealtimeHandlers(): void {
    if (!this.realtimeSession) return;

    // Log session events
    this.realtimeSession.on("session.created", (event) => {
      logger.info("Realtime session created", {
        sessionId: this.realtimeSession?.id,
      });
    });

    this.realtimeSession.on("error", (event) => {
      logger.error("Realtime session error:", event.data);
    });
  }
}
````

---

## Step-by-Step Implementation Plan

### Phase 1: Foundation (Week 1-2)

**Goal**: Establish voice module structure and core interfaces

1. **Create voice module directory structure**

   ```bash
   mkdir -p src/lib/voice
   mkdir -p src/lib/adapters/stt
   mkdir -p src/lib/adapters/realtime
   ```

2. **Implement core type definitions**
   - Create `src/lib/types/sttTypes.ts`
   - Create `src/lib/types/realtimeTypes.ts`
   - Create `src/lib/types/voiceTypes.ts`

3. **Implement voice error handling**
   - Create `src/lib/voice/errors.ts`
   - Add STTError, RealtimeError classes

4. **Create voice provider interface**
   - Create `src/lib/voice/voiceProviderInterface.ts`

### Phase 2: TTS Providers (Week 3-4)

**Goal**: Implement all TTS provider handlers

1. **Implement ElevenLabs TTS** (High Priority)
   - Streaming support
   - Voice cloning preparation

2. **Implement OpenAI TTS** (High Priority)
   - Both tts-1 and tts-1-hd models
   - Speed adjustment

3. **Implement Azure Speech TTS**
   - SSML support
   - Neural voice support

4. **Implement Sarvam TTS** (Indian languages)
   - Regional language support
   - Custom voice options

5. **Implement Murf, Play.ai, Speechify**
   - Basic synthesis support
   - Voice discovery

### Phase 3: STT Providers (Week 5-6)

**Goal**: Implement all STT provider handlers

1. **Implement Deepgram STT** (High Priority)
   - Nova-2 model support
   - Streaming transcription
   - Speaker diarization

2. **Implement OpenAI Whisper STT** (High Priority)
   - File upload transcription
   - Multi-language support

3. **Implement Gladia STT**
   - Advanced features (summarization, translation)
   - Real-time streaming

### Phase 4: Realtime Voice (Week 7-8)

**Goal**: Implement realtime voice providers

1. **Implement OpenAI Realtime Handler**
   - WebSocket connection management
   - Bidirectional audio streaming
   - Function calling support

2. **Extract Gemini Live Handler**
   - Refactor existing code from GoogleAIStudioProvider
   - Create standalone handler
   - Multi-modal support

### Phase 5: Composite Voice & Integration (Week 9-10)

**Goal**: Create composite voice and integrate with NeuroLink

1. **Implement CompositeVoice class**
   - TTS + STT combination
   - Conversation history
   - Streaming support

2. **Implement VoiceAgent class**
   - NeuroLink integration
   - Voice conversation flow
   - Realtime session management

3. **Update NeuroLink SDK**
   - Add voice-related methods
   - Expose voice providers
   - Update exports

### Phase 6: Testing & Documentation (Week 11-12)

**Goal**: Comprehensive testing and documentation

1. **Unit Tests**
   - Test each TTS handler
   - Test each STT handler
   - Test realtime handlers
   - Test CompositeVoice
   - Test VoiceAgent

2. **Integration Tests**
   - End-to-end voice conversation tests
   - Multi-provider tests
   - Streaming tests

3. **Documentation**
   - API reference
   - Usage examples
   - Provider comparison guide
   - Troubleshooting guide

---

## Code Examples

### Example 1: Basic TTS with Multiple Providers

```typescript
import { NeuroLink } from "@juspay/neurolink";
import { TTSProcessor } from "@juspay/neurolink/voice";
import { ElevenLabsTTSHandler } from "@juspay/neurolink/voice/providers";
import { writeFileSync } from "fs";

// Register ElevenLabs as a TTS provider
const elevenLabs = new ElevenLabsTTSHandler();
TTSProcessor.registerHandler("elevenlabs", elevenLabs);

// Generate speech with ElevenLabs
const result = await TTSProcessor.synthesize(
  "Hello! This is an example of ElevenLabs text-to-speech.",
  "elevenlabs",
  {
    voice: "21m00Tcm4TlvDq8ikWAM", // Rachel voice
    format: "mp3",
    speed: 1.0,
  },
);

// Save the audio
writeFileSync("output.mp3", result.buffer);
console.log(`Generated ${result.size} bytes of audio`);
```

### Example 2: Speech-to-Text with Deepgram

```typescript
import { DeepgramSTTHandler } from "@juspay/neurolink/voice/providers";
import { readFileSync } from "fs";

const deepgram = new DeepgramSTTHandler();

// Transcribe an audio file
const audioBuffer = readFileSync("recording.wav");
const result = await deepgram.transcribe(audioBuffer, {
  language: "en-US",
  diarization: true,
  wordTimestamps: true,
  model: "nova-2",
});

console.log("Transcription:", result.text);
console.log("Confidence:", result.confidence);
console.log("Duration:", result.duration, "seconds");

// Access speaker-separated segments
for (const segment of result.segments) {
  console.log(`Speaker ${segment.speaker}: "${segment.text}"`);
}
```

### Example 3: Full Voice Conversation

```typescript
import { NeuroLink } from "@juspay/neurolink";
import { CompositeVoice, VoiceAgent } from "@juspay/neurolink/voice";
import {
  ElevenLabsTTSHandler,
  DeepgramSTTHandler,
} from "@juspay/neurolink/voice/providers";

// Create composite voice with ElevenLabs + Deepgram
const voice = new CompositeVoice({
  ttsProvider: new ElevenLabsTTSHandler(),
  sttProvider: new DeepgramSTTHandler(),
  defaultTTSOptions: {
    voice: "21m00Tcm4TlvDq8ikWAM",
    format: "mp3",
  },
  defaultSTTOptions: {
    language: "en-US",
    model: "nova-2",
  },
});

// Create voice-enabled agent
const agent = new VoiceAgent({
  neurolink: new NeuroLink(),
  voice,
  systemPrompt: `You are a helpful customer service agent.
    Be concise and friendly in your responses.
    Keep responses under 50 words for natural conversation flow.`,
});

// Process user's voice input
const userAudioBuffer = readFileSync("user_question.wav");
const response = await agent.processVoice(userAudioBuffer);

console.log("User said:", response.userText);
console.log("Assistant replied:", response.assistantText);
console.log("Response time:", response.metadata.totalTime, "ms");

// Save audio response
writeFileSync("assistant_response.mp3", response.audio);
```

### Example 4: Realtime Voice with OpenAI

```typescript
import { OpenAIRealtimeHandler, VoiceAgent } from "@juspay/neurolink/voice";
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();
const realtime = new OpenAIRealtimeHandler();

// Connect to OpenAI Realtime API
const session = await realtime.connect({
  voice: "alloy",
  model: "gpt-4o-realtime-preview",
  instructions: `You are a helpful voice assistant for a banking app.
    Help users check balances, make transfers, and answer questions.
    Always confirm sensitive operations.`,
  turnDetection: "server_vad",
  vadThreshold: 0.5,
  tools: [
    {
      type: "function",
      name: "get_balance",
      description: "Get account balance",
      parameters: { type: "object", properties: {} },
    },
    {
      type: "function",
      name: "transfer_funds",
      description: "Transfer funds between accounts",
      parameters: {
        type: "object",
        properties: {
          from_account: { type: "string" },
          to_account: { type: "string" },
          amount: { type: "number" },
        },
        required: ["from_account", "to_account", "amount"],
      },
    },
  ],
});

// Create agent with realtime session
const agent = new VoiceAgent({
  neurolink,
  realtimeSession: session,
});

// Handle audio responses
agent.onAudioResponse((audio) => {
  // Play audio to user (implementation depends on platform)
  playAudioToSpeaker(audio);
});

// Handle text responses (for logging/display)
agent.onTextResponse((text) => {
  console.log("Assistant:", text);
});

// Stream microphone audio to agent
const microphoneStream = getMicrophoneStream(); // Platform-specific
for await (const chunk of microphoneStream) {
  agent.streamAudio(chunk);
}

// Cleanup
await agent.close();
```

### Example 5: Multi-Language Voice Support

```typescript
import { CompositeVoice } from "@juspay/neurolink/voice";
import { GoogleTTSHandler } from "@juspay/neurolink/voice/providers";
import { SarvamTTSHandler } from "@juspay/neurolink/voice/providers";
import { WhisperSTTHandler } from "@juspay/neurolink/voice/providers";

// Create voice instance with multi-language support
const voice = new CompositeVoice({
  ttsProvider: new GoogleTTSHandler(), // For international languages
  sttProvider: new WhisperSTTHandler(), // Supports 97+ languages
});

// Helper to get appropriate TTS handler for language
function getTTSForLanguage(langCode: string) {
  // Use Sarvam for Indian languages
  if (
    ["hi", "bn", "ta", "te", "mr", "gu", "kn", "ml", "pa", "or"].some((l) =>
      langCode.startsWith(l),
    )
  ) {
    return new SarvamTTSHandler();
  }
  // Use Google for all other languages
  return new GoogleTTSHandler();
}

// Transcribe and respond in detected language
const userAudio = readFileSync("user_audio.wav");
const transcription = await voice.listen(userAudio);

console.log(`Detected language: ${transcription.language}`);
console.log(`User said: ${transcription.text}`);

// Get AI response in same language
const response = await neurolink.generate({
  prompt: transcription.text,
  systemPrompt: `Respond in ${transcription.language}`,
});

// Synthesize in appropriate language
const ttsHandler = getTTSForLanguage(transcription.language);
const voiceId = await getVoiceForLanguage(ttsHandler, transcription.language);

const audioResponse = await ttsHandler.synthesize(response.content, {
  voice: voiceId,
  format: "mp3",
});

writeFileSync(`response_${transcription.language}.mp3`, audioResponse.buffer);
```

---

## Summary

This implementation guide provides a comprehensive roadmap for adding Mastra-style voice capabilities to NeuroLink:

**Key Components:**

- Voice Provider Interface (abstract interface for all voice providers)
- TTS Providers (8 providers: ElevenLabs, OpenAI, Azure, Google, Sarvam, Murf, Play.ai, Speechify)
- STT Providers (3 providers: Deepgram, Gladia, OpenAI Whisper)
- Realtime Voice (OpenAI Realtime API, Google Gemini Live)
- Composite Voice (combined TTS + STT for conversations)
- Voice Agent (integration with NeuroLink AI generation)

**Architecture Principles:**

- Factory pattern consistent with existing NeuroLink patterns
- Type-safe interfaces with comprehensive TypeScript definitions
- Streaming-first design for realtime applications
- Extensible provider system
- Error handling with dedicated error classes

**Implementation Timeline:** 12 weeks (3 months)

- Phase 1-2: Foundation and TTS (4 weeks)
- Phase 3: STT (2 weeks)
- Phase 4: Realtime (2 weeks)
- Phase 5: Integration (2 weeks)
- Phase 6: Testing & Documentation (2 weeks)

This implementation will enable NeuroLink users to build sophisticated voice-enabled AI applications with support for multiple providers, languages, and use cases.
