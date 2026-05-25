/**
 * Voice Module - Unified Voice/Speech Integration for NeuroLink
 *
 * Provides TTS (Text-to-Speech), STT (Speech-to-Text), and
 * Realtime Voice capabilities across multiple providers.
 *
 * Use TTSProcessor (src/lib/utils/ttsProcessor.ts) for TTS.
 * Use STTProcessor (src/lib/utils/sttProcessor.ts) for STT.
 * Use RealtimeProcessor for realtime voice sessions.
 *
 * Importing this module also auto-registers every shipped TTS / STT /
 * Realtime handler whose backing API key is present in `process.env`.
 * Registration is idempotent and silently skipped on failure.
 *
 * @module voice
 */

import type {
  RealtimeHandler,
  STTHandler,
  TTSHandler,
} from "../types/index.js";
import { logger } from "../utils/logger.js";
import { STTProcessor } from "../utils/sttProcessor.js";
import { TTSProcessor } from "../utils/ttsProcessor.js";
import { GoogleTTSHandler } from "../adapters/tts/googleTTSHandler.js";
import { RealtimeProcessor } from "./RealtimeVoiceAPI.js";

// ============================================================================
// ERROR CODES AND CONSTANTS
// ============================================================================

export {
  AUDIO_FORMAT_DETAILS,
  DEFAULT_REALTIME_CONFIG,
  DEFAULT_STT_OPTIONS,
  // Type guards
  isSTTResult,
  isTranscriptionSegment,
  isValidRealtimeConfig,
  isValidSTTOptions,
  REALTIME_ERROR_CODES,
  STT_ERROR_CODES,
  VOICE_ERROR_CODES,
} from "../types/index.js";

// ============================================================================
// ERRORS
// ============================================================================

export { RealtimeError, STTError, VoiceError } from "./errors.js";

// ============================================================================
// REALTIME VOICE API
// ============================================================================

export { BaseRealtimeHandler, RealtimeProcessor } from "./RealtimeVoiceAPI.js";

// ============================================================================
// AUDIO UTILITIES
// ============================================================================

export {
  AUDIO_SIGNATURES,
  calculateDuration,
  convertAudioFormat,
  createPcmBuffer,
  createWavFile,
  createWavHeader,
  detectAudioFormat,
  extractPcmSamples,
  getFileExtension,
  getMimeType,
  MIME_TYPES,
  normalizeAudio,
  resamplePcm,
  splitIntoChunks,
} from "./audio-utils.js";

// ============================================================================
// STREAM HANDLER
// ============================================================================

export {
  asyncIterableToStream,
  ChunkedAudioStream,
  StreamHandler,
  StreamMerger,
  StreamSplitter,
  streamToAsyncIterable,
} from "./stream-handler.js";

// ============================================================================
// TTS PROVIDERS
// ============================================================================

export { GoogleTTSHandler } from "../adapters/tts/googleTTSHandler.js";
export { AzureTTS, AzureTTS as AzureTTSHandler } from "./providers/AzureTTS.js";
export {
  CartesiaTTS,
  CartesiaTTS as CartesiaTTSHandler,
} from "./providers/CartesiaTTS.js";
export {
  ElevenLabsTTS,
  ElevenLabsTTS as ElevenLabsTTSHandler,
} from "./providers/ElevenLabsTTS.js";
export {
  FishAudioTTS,
  FishAudioTTS as FishAudioTTSHandler,
} from "./providers/FishAudioTTS.js";
export {
  OpenAITTS,
  OpenAITTS as OpenAITTSHandler,
} from "./providers/OpenAITTS.js";

// ============================================================================
// STT PROVIDERS
// ============================================================================

export { AzureSTT, AzureSTT as AzureSTTHandler } from "./providers/AzureSTT.js";
export {
  DeepgramSTT,
  DeepgramSTT as DeepgramSTTHandler,
} from "./providers/DeepgramSTT.js";
export {
  GoogleSTT,
  GoogleSTT as GoogleSTTHandler,
} from "./providers/GoogleSTT.js";
export {
  OpenAISTT,
  OpenAISTTHandler,
  WhisperSTT,
  WhisperSTTHandler,
} from "./providers/OpenAISTT.js";

// ============================================================================
// REALTIME PROVIDERS
// ============================================================================

export {
  GeminiLive,
  GeminiLive as GeminiLiveHandler,
} from "./providers/GeminiLive.js";
export {
  OpenAIRealtime,
  OpenAIRealtime as OpenAIRealtimeHandler,
} from "./providers/OpenAIRealtime.js";

// ============================================================================
// AUTO-REGISTRATION
// ============================================================================

import { AzureTTS } from "./providers/AzureTTS.js";
import { CartesiaTTS } from "./providers/CartesiaTTS.js";
import { ElevenLabsTTS } from "./providers/ElevenLabsTTS.js";
import { FishAudioTTS } from "./providers/FishAudioTTS.js";
import { OpenAITTS } from "./providers/OpenAITTS.js";

import { AzureSTT } from "./providers/AzureSTT.js";
import { DeepgramSTT } from "./providers/DeepgramSTT.js";
import { GoogleSTT } from "./providers/GoogleSTT.js";
import { OpenAISTT } from "./providers/OpenAISTT.js";

import { GeminiLive } from "./providers/GeminiLive.js";
import { OpenAIRealtime } from "./providers/OpenAIRealtime.js";

const TTS_HANDLER_CANDIDATES: ReadonlyArray<{
  readonly name: string;
  readonly aliases?: readonly string[];
  readonly factory: () => TTSHandler;
}> = [
  {
    // Google TTS doubles as both the AI Studio and Vertex TTS handler.
    name: "google-ai",
    aliases: ["vertex"],
    factory: () => new GoogleTTSHandler(),
  },
  { name: "openai-tts", factory: () => new OpenAITTS() },
  {
    name: "elevenlabs",
    aliases: ["elevenlabs-tts"],
    factory: () => new ElevenLabsTTS(),
  },
  { name: "azure-tts", factory: () => new AzureTTS() },
  { name: "fish-audio", factory: () => new FishAudioTTS() },
  { name: "cartesia", factory: () => new CartesiaTTS() },
];

const STT_HANDLER_CANDIDATES: ReadonlyArray<{
  readonly name: string;
  readonly aliases?: readonly string[];
  readonly factory: () => STTHandler;
}> = [
  {
    name: "whisper",
    aliases: ["openai-stt"],
    factory: () => new OpenAISTT(),
  },
  { name: "deepgram", factory: () => new DeepgramSTT() },
  { name: "google-stt", factory: () => new GoogleSTT() },
  { name: "azure-stt", factory: () => new AzureSTT() },
];

const REALTIME_HANDLER_CANDIDATES: ReadonlyArray<{
  readonly name: string;
  readonly aliases?: readonly string[];
  readonly factory: () => RealtimeHandler;
}> = [
  { name: "openai-realtime", factory: () => new OpenAIRealtime() },
  { name: "gemini-live", factory: () => new GeminiLive() },
];

function registerCandidates<H extends { isConfigured(): boolean }>(
  candidates: ReadonlyArray<{
    readonly name: string;
    readonly aliases?: readonly string[];
    readonly factory: () => H;
  }>,
  supports: (name: string) => boolean,
  getRegistered: (name: string) => H | undefined,
  register: (name: string, handler: H) => void,
  scope: string,
  requireConfigured: boolean,
): void {
  for (const { name, aliases, factory } of candidates) {
    // Compute missingName / missingAliases separately so a manually-
    // registered primary name doesn't block alias backfill. Important for
    // BC: existing callers that register e.g. "elevenlabs" should still
    // see "elevenlabs-tts" wired up by this loop.
    const missingName = !supports(name);
    const missingAliases = (aliases ?? []).filter((alias) => !supports(alias));
    if (!missingName && missingAliases.length === 0) {
      continue;
    }
    try {
      // If the primary is already registered, reuse that exact handler
      // instance for any alias backfill — wiring an alias to a *different*
      // factory-fresh instance would silently diverge from the canonical
      // primary's behavior (different config, different credentials).
      // Only call factory() when we actually need to register the primary.
      let handler: H | undefined;
      if (!missingName) {
        handler = getRegistered(name);
      }
      if (!handler) {
        handler = factory();
        if (requireConfigured && !handler.isConfigured()) {
          continue;
        }
      }
      if (missingName) {
        register(name, handler);
      }
      for (const alias of missingAliases) {
        register(alias, handler);
      }
    } catch (err) {
      logger.debug(
        `[${scope}] ${name} auto-registration skipped: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}

/**
 * Register every shipped TTS handler whose backing credentials are
 * present in the environment. Safe to call multiple times.
 */
export function registerDefaultTTSHandlers(): void {
  registerCandidates(
    TTS_HANDLER_CANDIDATES,
    (name) => TTSProcessor.supports(name),
    (name) => TTSProcessor.getHandler(name),
    (name, handler) => TTSProcessor.registerHandler(name, handler),
    "voice/tts",
    true,
  );
}

/**
 * Register every shipped STT handler whose backing credentials are
 * present in the environment. Safe to call multiple times.
 */
export function registerDefaultSTTHandlers(): void {
  registerCandidates(
    STT_HANDLER_CANDIDATES,
    (name) => STTProcessor.supports(name),
    (name) => STTProcessor.getHandler(name),
    (name, handler) => STTProcessor.registerHandler(name, handler),
    "voice/stt",
    true,
  );
}

/**
 * Register every shipped Realtime handler. Realtime handlers don't gate
 * registration on isConfigured() because session-time API keys can be
 * supplied per-call; missing creds surface when `connect()` is invoked.
 */
export function registerDefaultRealtimeHandlers(): void {
  registerCandidates(
    REALTIME_HANDLER_CANDIDATES,
    (name) => RealtimeProcessor.supports(name),
    (name) => RealtimeProcessor.getHandler(name),
    (name, handler) => RealtimeProcessor.registerHandler(name, handler),
    "voice/realtime",
    false,
  );
}

// Run once at module import so consumers who follow the documented
// `nl.generate(...)` flow get every configured handler without manually
// calling `registerHandler`.
registerDefaultTTSHandlers();
registerDefaultSTTHandlers();
registerDefaultRealtimeHandlers();
