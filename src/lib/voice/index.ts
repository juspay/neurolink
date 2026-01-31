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

export type {
  // Voice capability types
  VoiceCapability,
  VoiceProviderType,
  VoiceProviderConfig,
  VoiceProviderMetadata,
  // STT types
  STTOptions,
  STTResult,
  STTLanguage,
  TranscriptionSegment,
  WordTiming,
  // Realtime types
  RealtimeConfig,
  RealtimeSession,
  RealtimeSessionState,
  RealtimeAudioChunk,
  RealtimeMessage,
  RealtimeMessageType,
  RealtimeTool,
  RealtimeEventHandlers,
  // Composite voice types
  CompositeVoiceConfig,
  CompositeVoiceSession,
  // Voice agent types
  VoiceAgentConfig,
  VoiceProcessingResult,
  VoiceTurn,
  // Audio utility types
  AudioFormatDetails,
  AudioConversionOptions,
  AudioStreamChunk,
} from "./types/voiceTypes.js";

// Re-export TTS types from the main types module
export type {
  AudioFormat,
  TTSOptions,
  TTSResult,
  TTSVoice,
} from "./types/voiceTypes.js";

// ============================================================================
// ERROR CODES AND CONSTANTS
// ============================================================================

export {
  STT_ERROR_CODES,
  REALTIME_ERROR_CODES,
  VOICE_ERROR_CODES,
  AUDIO_FORMAT_DETAILS,
  DEFAULT_STT_OPTIONS,
  DEFAULT_REALTIME_CONFIG,
  // Type guards
  isSTTResult,
  isValidSTTOptions,
  isValidRealtimeConfig,
  isTranscriptionSegment,
} from "./types/voiceTypes.js";

// ============================================================================
// ERRORS
// ============================================================================

export {
  VoiceError,
  STTError,
  RealtimeError,
  type VoiceErrorOptions,
} from "./errors.js";

// ============================================================================
// STT PROVIDER
// ============================================================================

export {
  STTProcessor,
  type STTHandler,
} from "./STTProvider.js";

// ============================================================================
// REALTIME VOICE API
// ============================================================================

export {
  RealtimeProcessor,
  BaseRealtimeHandler,
  type RealtimeHandler,
} from "./RealtimeVoiceAPI.js";

// ============================================================================
// VOICE FACTORY
// ============================================================================

export {
  VoiceFactory,
  voiceFactory,
  type VoiceHandler,
} from "./VoiceFactory.js";

// ============================================================================
// VOICE REGISTRY
// ============================================================================

export {
  VoiceRegistry,
  voiceRegistry,
  type VoiceProviderEntry,
  type VoiceHandler as VoiceHandlerType,
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
  detectAudioFormat,
  calculateDuration,
  convertAudioFormat,
  createPcmBuffer,
  extractPcmSamples,
  resamplePcm,
  normalizeAudio,
  createWavHeader,
  createWavFile,
  splitIntoChunks,
  getMimeType,
  getFileExtension,
  AUDIO_SIGNATURES,
  MIME_TYPES,
} from "./audio-utils.js";

// ============================================================================
// STREAM HANDLER
// ============================================================================

export {
  ChunkedAudioStream,
  StreamMerger,
  StreamSplitter,
  streamToAsyncIterable,
  asyncIterableToStream,
  StreamHandler,
  type StreamHandlerConfig,
  type StreamEvents,
} from "./stream-handler.js";

// ============================================================================
// TTS PROVIDERS
// ============================================================================

// Note: TTS providers are imported dynamically to avoid circular dependencies
// Use VoiceFactory.createTTS() instead of importing directly
//
// Available TTS providers:
// - 'openai' (OpenAITTS)
// - 'google' (GoogleTTS)
// - 'azure' (AzureTTS)
// - 'elevenlabs' (ElevenLabsTTS)

// ============================================================================
// STT PROVIDERS
// ============================================================================

// Note: STT providers are imported dynamically to avoid circular dependencies
// Use VoiceFactory.createSTT() instead of importing directly
//
// Available STT providers:
// - 'openai' / 'whisper' (OpenAISTT)
// - 'google' (GoogleSTT)
// - 'azure' (AzureSTT)
// - 'deepgram' (DeepgramSTT)

// ============================================================================
// REALTIME PROVIDERS
// ============================================================================

// Note: Realtime providers are imported dynamically to avoid circular dependencies
// Use VoiceFactory.createRealtime() instead of importing directly
//
// Available Realtime providers:
// - 'openai' (OpenAIRealtime)
// - 'gemini' (GeminiLive)
