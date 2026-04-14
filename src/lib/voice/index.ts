/**
 * Voice Module - Unified Voice/Speech Integration for NeuroLink
 *
 * Provides comprehensive TTS (Text-to-Speech), STT (Speech-to-Text), and
 * Realtime Voice capabilities across multiple providers.
 *
 * @module voice
 *
 * @example
 * ```typescript
 * import {
 *   VoiceFactory,
 *   VoiceRegistry,
 *   STTProcessor,
 *   RealtimeProcessor,
 *   CompositeVoice,
 *   VoiceAgent,
 * } from '@neurolink/voice';
 *
 * // Create TTS provider
 * const tts = await VoiceFactory.getInstance().createTTS('google');
 * const result = await tts.synthesize('Hello world');
 *
 * // Create STT provider
 * const stt = await VoiceFactory.getInstance().createSTT('whisper');
 * const transcript = await stt.transcribe(audioBuffer, { language: 'en-US' });
 *
 * // Create Realtime session
 * const realtime = await VoiceFactory.getInstance().createRealtime('openai');
 * await realtime.connect({ provider: 'openai', voice: 'alloy' });
 *
 * // Use CompositeVoice for bidirectional conversations
 * const voice = new CompositeVoice({
 *   ttsProvider: 'elevenlabs',
 *   sttProvider: 'deepgram',
 * });
 * const userText = await voice.transcribe(userAudioBuffer);
 * const responseAudio = await voice.synthesize('Hello! How can I help?');
 *
 * // Use VoiceAgent for full voice-enabled AI
 * const agent = new VoiceAgent({
 *   neurolink,
 *   sttProvider: 'deepgram',
 *   ttsProvider: 'elevenlabs',
 *   systemPrompt: 'You are a helpful voice assistant.',
 * });
 * const result = await agent.processVoice(userAudioBuffer);
 * ```
 */

// ============================================================================
// TYPES
// ============================================================================

// Re-export TTS types from the main types module
export type {
  AudioConversionOptions,
  AudioFormat,
  // Audio utility types
  AudioFormatDetails,
  AudioStreamChunk,
  // Composite voice types
  CompositeVoiceConfig,
  CompositeVoiceSession,
  RealtimeAudioChunk,
  // Realtime types
  RealtimeConfig,
  RealtimeEventHandlers,
  RealtimeMessage,
  RealtimeMessageType,
  RealtimeSession,
  RealtimeSessionState,
  RealtimeTool,
  STTLanguage,
  // STT types
  STTOptions,
  STTResult,
  TranscriptionSegment,
  TTSOptions,
  TTSResult,
  TTSVoice,
  // Voice agent types
  VoiceAgentConfig,
  // Voice capability types
  VoiceCapability,
  VoiceProcessingResult,
  VoiceProviderConfig,
  VoiceProviderMetadata,
  VoiceProviderType,
  VoiceTurn,
  WordTiming,
} from "./types/voiceTypes.js";

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
} from "./types/voiceTypes.js";

// ============================================================================
// ERRORS
// ============================================================================

export {
  RealtimeError,
  STTError,
  VoiceError,
  type VoiceErrorOptions,
} from "./errors.js";

// ============================================================================
// STT PROVIDER
// ============================================================================

export { type STTHandler, STTProcessor } from "./STTProvider.js";

// ============================================================================
// REALTIME VOICE API
// ============================================================================

export {
  BaseRealtimeHandler,
  type RealtimeHandler,
  RealtimeProcessor,
} from "./RealtimeVoiceAPI.js";

// ============================================================================
// VOICE FACTORY
// ============================================================================

export {
  VoiceFactory,
  type VoiceHandler,
  voiceFactory,
} from "./VoiceFactory.js";

// ============================================================================
// VOICE REGISTRY
// ============================================================================

export {
  type VoiceHandler as VoiceHandlerType,
  type VoiceProviderEntry,
  VoiceRegistry,
  voiceRegistry,
} from "./VoiceRegistry.js";

// ============================================================================
// COMPOSITE VOICE (Bidirectional TTS + STT)
// ============================================================================

export { CompositeVoice } from "./compositeVoice.js";

// ============================================================================
// VOICE AGENT (High-level AI-enabled voice processing)
// ============================================================================

export {
  VoiceAgent,
  type VoiceAgentEvent,
  type VoiceAgentEventData,
} from "./voiceAgent.js";

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
  type StreamEvents,
  StreamHandler,
  type StreamHandlerConfig,
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
// Export TTS provider classes for direct use
export {
  GoogleTTS,
  GoogleTTS as GoogleTTSHandler,
} from "./providers/GoogleTTS.js";
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
