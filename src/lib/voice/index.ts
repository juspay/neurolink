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
 * @module voice
 */

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

export { AzureTTS, AzureTTS as AzureTTSHandler } from "./providers/AzureTTS.js";
export {
  ElevenLabsTTS,
  ElevenLabsTTS as ElevenLabsTTSHandler,
} from "./providers/ElevenLabsTTS.js";
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
// Export STT provider classes for direct use
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
// Export Realtime provider classes for direct use
export {
  OpenAIRealtime,
  OpenAIRealtime as OpenAIRealtimeHandler,
} from "./providers/OpenAIRealtime.js";
