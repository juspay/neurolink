/**
 * Speech-to-Text (STT) Type Definitions for NeuroLink
 *
 * All STT-specific types: options, results, handlers,
 * provider-specific options, error codes, defaults, and type guards.
 *
 * @module types/stt
 */

import type { AudioFormat } from "./tts.js";

// ============================================================================
// CORE STT TYPES
// ============================================================================

/**
 * STT configuration options
 */
export type STTOptions = {
  /** Enable STT processing */
  enabled?: boolean;
  /** Override STT provider */
  provider?: string;
  /** Language code for transcription (e.g., "en-US") */
  language?: string;
  /** Audio format of input */
  format?: AudioFormat;
  /** Sample rate in Hz */
  sampleRate?: number;
  /** Enable punctuation in transcription */
  punctuation?: boolean;
  /** Enable punctuation (alias) */
  punctuate?: boolean;
  /** Enable profanity filter */
  profanityFilter?: boolean;
  /** Enable speaker diarization */
  speakerDiarization?: boolean;
  /** Enable speaker diarization (alias) */
  diarization?: boolean;
  /** Number of speakers (for diarization) */
  speakerCount?: number;
  /** Enable word-level timestamps */
  wordTimestamps?: boolean;
  /** Model variant to use */
  model?: string;
  /** Custom vocabulary/phrases */
  vocabulary?: string[];
  /** Minimum confidence threshold */
  confidenceThreshold?: number;
};

/**
 * STT result from transcription
 */
export type STTResult = {
  /** Full transcribed text */
  text: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Detected language code */
  language?: string;
  /** Audio duration in seconds */
  duration?: number;
  /** Word-level timings */
  words?: WordTiming[];
  /** Transcription segments */
  segments?: TranscriptionSegment[];
  /** Speaker labels (for diarization) */
  speakers?: string[];
  /** Performance metadata */
  metadata?: {
    /** Processing latency in milliseconds */
    latency: number;
    /** Provider name */
    provider?: string;
    /** Model used */
    model?: string;
    /** Additional provider-specific metadata */
    [key: string]: unknown;
  };
};

/**
 * STT language information
 */
export type STTLanguage = {
  /** Language code (e.g., "en-US") */
  code: string;
  /** Language name */
  name: string;
  /** Whether the language supports speaker diarization */
  supportsDiarization?: boolean;
  /** Whether the language supports punctuation */
  supportsPunctuation?: boolean;
};

/**
 * Word-level timing information
 */
export type WordTiming = {
  /** The word */
  word: string;
  /** Start time in seconds */
  startTime?: number;
  /** Start time alias */
  start?: number;
  /** End time in seconds */
  endTime?: number;
  /** End time alias */
  end?: number;
  /** Confidence score (0-1) */
  confidence?: number;
  /** Speaker label (for diarization) */
  speaker?: string;
};

/**
 * Transcription segment for streaming STT
 */
export type TranscriptionSegment = {
  /** Segment index */
  index?: number;
  /** Transcribed text */
  text: string;
  /** Whether this is a final result */
  isFinal: boolean;
  /** Confidence score (0-1) */
  confidence?: number;
  /** Start time in audio (seconds) */
  startTime?: number;
  /** Start time (alias for startTime) */
  start?: number;
  /** End time in audio (seconds) */
  endTime?: number;
  /** End time (alias for endTime) */
  end?: number;
  /** Word-level timings */
  words?: WordTiming[];
  /** Speaker label */
  speaker?: string;
  /** Detected language */
  language?: string;
};

// ============================================================================
// STT HANDLER TYPE
// ============================================================================

export type STTHandler = {
  transcribe(
    audio: Buffer | ArrayBuffer,
    options: STTOptions,
  ): Promise<STTResult>;
  transcribeStream?(
    audioStream: AsyncIterable<Buffer>,
    options: STTOptions,
  ): AsyncIterable<TranscriptionSegment>;
  getSupportedLanguages?(): Promise<STTLanguage[]>;
  getSupportedFormats(): AudioFormat[];
  isConfigured(): boolean;
  maxAudioDuration?: number;
  supportsStreaming?: boolean;
};

// ============================================================================
// STT ERROR CODES
// ============================================================================

/**
 * STT error codes
 */
export const STT_ERROR_CODES = {
  AUDIO_EMPTY: "STT_AUDIO_EMPTY",
  AUDIO_TOO_LONG: "STT_AUDIO_TOO_LONG",
  INVALID_AUDIO_FORMAT: "STT_INVALID_AUDIO_FORMAT",
  LANGUAGE_NOT_SUPPORTED: "STT_LANGUAGE_NOT_SUPPORTED",
  TRANSCRIPTION_FAILED: "STT_TRANSCRIPTION_FAILED",
  PROVIDER_NOT_CONFIGURED: "STT_PROVIDER_NOT_CONFIGURED",
  PROVIDER_NOT_SUPPORTED: "STT_PROVIDER_NOT_SUPPORTED",
  STREAM_ERROR: "STT_STREAM_ERROR",
  STREAMING_NOT_SUPPORTED: "STT_STREAMING_NOT_SUPPORTED",
} as const;

// ============================================================================
// STT DEFAULTS
// ============================================================================

/**
 * Default STT options
 */
export const DEFAULT_STT_OPTIONS: Required<
  Pick<
    STTOptions,
    "language" | "punctuation" | "profanityFilter" | "sampleRate"
  >
> = {
  language: "en-US",
  punctuation: true,
  profanityFilter: false,
  sampleRate: 16000,
};

// ============================================================================
// STT TYPE GUARDS
// ============================================================================

/**
 * Type guard for STTResult
 */
export function isSTTResult(value: unknown): value is STTResult {
  if (!value || typeof value !== "object") {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.text === "string" &&
    typeof obj.confidence === "number" &&
    obj.confidence >= 0 &&
    obj.confidence <= 1
  );
}

/**
 * Type guard for valid STTOptions
 */
export function isValidSTTOptions(options: unknown): options is STTOptions {
  if (!options || typeof options !== "object") {
    return false;
  }
  const opts = options as STTOptions;
  if (opts.sampleRate !== undefined) {
    if (typeof opts.sampleRate !== "number" || opts.sampleRate <= 0) {
      return false;
    }
  }
  if (opts.speakerCount !== undefined) {
    if (
      typeof opts.speakerCount !== "number" ||
      opts.speakerCount < 1 ||
      opts.speakerCount > 10
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Type guard for TranscriptionSegment
 */
export function isTranscriptionSegment(
  value: unknown,
): value is TranscriptionSegment {
  if (!value || typeof value !== "object") {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.index === "number" &&
    typeof obj.text === "string" &&
    typeof obj.isFinal === "boolean"
  );
}

// ============================================================================
// PROVIDER-SPECIFIC STT OPTION TYPES
// ============================================================================

export type AzureRecognitionMode = "interactive" | "conversation" | "dictation";

export type AzureOutputFormat = "simple" | "detailed";

export type AzureSTTOptions = STTOptions & {
  recognitionMode?: AzureRecognitionMode;
  outputFormat?: AzureOutputFormat;
  interimResults?: boolean;
  endpointId?: string;
  /** Custom endpoint ID (alias for endpointId) */
  customEndpointId?: string;
  connectionTimeout?: number;
  silenceTimeout?: number;
  profanityOption?: "masked" | "removed" | "raw";
  /** Profanity mode (alias for profanityOption) */
  profanityMode?: "masked" | "removed" | "raw";
  initialSilenceTimeout?: number;
  enableLogging?: boolean;
  phraseList?: string[];
  /** Whether to request detailed output format */
  detailed?: boolean;
  wordLevelConfidence?: boolean;
  initialSilenceTimeoutMs?: number;
  endSilenceTimeoutMs?: number;
};

export type DeepgramModel =
  | "nova-2"
  | "nova-2-general"
  | "nova-2-meeting"
  | "nova-2-phonecall"
  | "nova-2-voicemail"
  | "nova-2-finance"
  | "nova-2-medical"
  | "nova"
  | "enhanced"
  | "base";

export type DeepgramSTTOptions = STTOptions & {
  model?: DeepgramModel | "nova-3";
  smartFormat?: boolean;
  search?: string[];
  replace?: Array<{ find: string; replace: string }>;
  utterances?: boolean;
  utterSplit?: number;
  /** Alias for utterSplit (legacy field name) */
  uttSplit?: number;
  paragraphs?: boolean;
  keywords?: string[];
  keywordBoost?: "legacy" | "medium" | "high";
  fillerWords?: boolean;
  detectTopics?: boolean;
  detectEntities?: boolean;
  summarize?: boolean;
  redact?: ("pci" | "numbers" | "ssn")[];
};

export type GoogleSTTModel =
  | "latest_short"
  | "latest_long"
  | "telephony"
  | "medical_conversation"
  | "medical_dictation"
  | "command_and_search"
  | "phone_call"
  | "video"
  | "default";

export type GoogleSTTAudioEncoding =
  | "ENCODING_UNSPECIFIED"
  | "LINEAR16"
  | "FLAC"
  | "MULAW"
  | "AMR"
  | "AMR_WB"
  | "OGG_OPUS"
  | "SPEEX_WITH_HEADER_BYTE"
  | "MP3"
  | "WEBM_OPUS";

export type GoogleSTTOptions = STTOptions & {
  model?: GoogleSTTModel;
  encoding?: GoogleSTTAudioEncoding;
  sampleRateHertz?: number;
  audioChannelCount?: number;
  enableSeparateRecognitionPerChannel?: boolean;
  alternativeLanguageCodes?: string[];
  maxAlternatives?: number;
  enableAutomaticPunctuation?: boolean;
  enableSpokenPunctuation?: boolean;
  enableSpokenEmojis?: boolean;
  speechContexts?: Array<{
    phrases: string[];
    boost?: number;
  }>;
  adaptation?: {
    phraseSets?: string[];
    customClasses?: string[];
  };
  useEnhanced?: boolean;
  keywords?: string[];
};

export type WhisperModel = "whisper-1";

export type WhisperSTTOptions = STTOptions & {
  model?: WhisperModel;
  responseFormat?: "json" | "text" | "srt" | "verbose_json" | "vtt";
  temperature?: number;
  prompt?: string;
  /** Translate audio to English instead of transcribing in original language */
  translate?: boolean;
};

// ============================================================================
// PROVIDER-INTERNAL API RESPONSE TYPES
// (Moved here from individual provider files per Rule 2 / no-local-type-alias)
// ============================================================================

// --- Azure STT ---

export type AzureWord = {
  Word: string;
  Offset: number; // In 100-nanosecond units
  Duration: number;
  Confidence?: number;
};

export type AzureNBest = {
  Confidence: number;
  Lexical: string;
  ITN: string;
  MaskedITN: string;
  Display: string;
  Words?: AzureWord[];
};

export type AzureRecognitionResult = {
  RecognitionStatus:
    | "Success"
    | "NoMatch"
    | "InitialSilenceTimeout"
    | "BabbleTimeout"
    | "Error"
    | string;
  Offset?: number;
  Duration?: number;
  DisplayText?: string;
  NBest?: AzureNBest[];
};

export type AzureSpeakerRecognitionResult = AzureRecognitionResult & {
  SpeakerId?: string;
};

// --- Deepgram ---

export type DeepgramWord = {
  word: string;
  start: number;
  end: number;
  confidence: number;
  speaker?: number;
  punctuated_word?: string;
};

export type DeepgramAlternative = {
  transcript: string;
  confidence: number;
  words: DeepgramWord[];
  paragraphs?: {
    transcript: string;
    paragraphs: Array<{
      sentences: Array<{
        text: string;
        start: number;
        end: number;
      }>;
    }>;
  };
};

export type DeepgramChannel = {
  alternatives: DeepgramAlternative[];
};

export type DeepgramUtterance = {
  start: number;
  end: number;
  confidence: number;
  channel: number;
  transcript: string;
  words: DeepgramWord[];
  speaker?: number;
  id?: string;
};

export type DeepgramResult = {
  channels: DeepgramChannel[];
  utterances?: DeepgramUtterance[];
};

export type DeepgramResponse = {
  metadata: {
    request_id: string;
    transaction_key?: string;
    sha256?: string;
    created: string;
    duration: number;
    channels: number;
    models: string[];
    model_info?: Record<string, { name: string; version: string }>;
  };
  results: DeepgramResult;
};

// --- Google STT ---

export type GoogleWordInfo = {
  startTime: string; // Duration format "1.500s"
  endTime: string;
  word: string;
  confidence?: number;
  speakerTag?: number;
};

export type GoogleSpeechRecognitionAlternative = {
  transcript: string;
  confidence: number;
  words?: GoogleWordInfo[];
};

export type GoogleSpeechRecognitionResult = {
  alternatives: GoogleSpeechRecognitionAlternative[];
  channelTag?: number;
  languageCode?: string;
  resultEndTime?: string;
};

export type GoogleLongRunningRecognizeResponse = {
  results: GoogleSpeechRecognitionResult[];
  totalBilledTime?: string;
};

export type GoogleRecognizeResponse = {
  results?: GoogleSpeechRecognitionResult[];
  totalBilledTime?: string;
};

export type GoogleOperationResponse = {
  name: string;
  done: boolean;
  metadata?: {
    progressPercent?: number;
    startTime?: string;
    lastUpdateTime?: string;
  };
  response?: GoogleLongRunningRecognizeResponse;
  error?: {
    code: number;
    message: string;
  };
};

export type GoogleRecognitionConfig = {
  encoding: string;
  sampleRateHertz?: number;
  languageCode: string;
  enableAutomaticPunctuation?: boolean;
  enableWordTimeOffsets?: boolean;
  enableWordConfidence?: boolean;
  model?: string;
  useEnhanced?: boolean;
  maxAlternatives?: number;
  profanityFilter?: boolean;
  enableSpeakerDiarization?: boolean;
  diarizationSpeakerCount?: number;
};

export type GoogleRecognitionAudio = {
  content: string;
};

// --- Whisper ---

export type WhisperTranscriptionWord = {
  word: string;
  start: number;
  end: number;
};

export type WhisperTranscriptionSegment = {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  tokens: number[];
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  no_speech_prob: number;
};

export type WhisperVerboseResponse = {
  task: string;
  language: string;
  duration: number;
  text: string;
  segments?: WhisperTranscriptionSegment[];
  words?: WhisperTranscriptionWord[];
};

export type WhisperSimpleResponse = {
  text: string;
};

// --- ElevenLabs ---

export type ElevenLabsVoice = {
  voice_id: string;
  name: string;
  category: string;
  labels?: {
    accent?: string;
    description?: string;
    age?: string;
    gender?: string;
    use_case?: string;
  };
  preview_url?: string;
};

export type ElevenLabsVoicesResponse = {
  voices: ElevenLabsVoice[];
};

// --- Azure TTS ---

export type AzureVoiceInfo = {
  Name: string;
  DisplayName: string;
  LocalName: string;
  ShortName: string;
  Gender: string;
  Locale: string;
  LocaleName: string;
  VoiceType: string;
  Status: string;
  WordsPerMinute?: string;
};

// --- Google TTS ---

export type GoogleAudioConfig = {
  audioEncoding: string;
  speakingRate?: number;
  pitch?: number;
  volumeGainDb?: number;
  sampleRateHertz?: number;
  effectsProfileId?: string[];
};

export type GoogleVoiceSelectionParams = {
  languageCode: string;
  name?: string;
  ssmlGender?: string;
};

export type GoogleSynthesisInput = {
  text?: string;
  ssml?: string;
};

export type GoogleSynthesizeRequest = {
  input: GoogleSynthesisInput;
  voice: GoogleVoiceSelectionParams;
  audioConfig: GoogleAudioConfig;
};

export type GoogleVoiceInfo = {
  languageCodes: string[];
  name: string;
  ssmlGender: string;
  naturalSampleRateHertz: number;
};

export type GoogleListVoicesResponse = {
  voices: GoogleVoiceInfo[];
};

export type GoogleSynthesizeResponse = {
  audioContent: string;
};

// --- OpenAI Realtime ---

export type OpenAIRealtimeEvent = {
  type: string;
  event_id?: string;
  [key: string]: unknown;
};

export type OpenAISessionCreated = OpenAIRealtimeEvent & {
  type: "session.created";
  session: {
    id: string;
    object: string;
    model: string;
    modalities: string[];
    voice: string;
    input_audio_format: string;
    output_audio_format: string;
    turn_detection: {
      type: string;
      threshold?: number;
      prefix_padding_ms?: number;
      silence_duration_ms?: number;
    };
    tools: unknown[];
    tool_choice: string;
    temperature: number;
    max_response_output_tokens: string | number;
  };
};

export type OpenAIAudioDelta = OpenAIRealtimeEvent & {
  type: "response.audio.delta";
  response_id: string;
  item_id: string;
  output_index: number;
  content_index: number;
  delta: string; // base64 audio
};

export type OpenAITranscriptDelta = OpenAIRealtimeEvent & {
  type:
    | "response.audio_transcript.delta"
    | "conversation.item.input_audio_transcription.completed";
  delta?: string;
  transcript?: string;
};

// --- Gemini Live ---

export type GeminiMessage = {
  setup?: {
    model: string;
    generationConfig?: {
      responseModalities?: string[];
      speechConfig?: {
        voiceConfig?: {
          prebuiltVoiceConfig?: {
            voiceName?: string;
          };
        };
      };
    };
    systemInstruction?: {
      parts: Array<{ text: string }>;
    };
    tools?: unknown[];
  };
  realtimeInput?: {
    mediaChunks: Array<{
      mimeType: string;
      data: string; // base64
    }>;
  };
  clientContent?: {
    turns: Array<{
      role: string;
      parts: Array<{ text: string }>;
    }>;
    turnComplete: boolean;
  };
};

export type GeminiResponse = {
  setupComplete?: Record<string, unknown>;
  serverContent?: {
    modelTurn?: {
      parts: Array<{
        text?: string;
        inlineData?: {
          mimeType: string;
          data: string;
        };
      }>;
    };
    turnComplete?: boolean;
    interrupted?: boolean;
  };
  toolCall?: {
    functionCalls: Array<{
      id: string;
      name: string;
      args: Record<string, unknown>;
    }>;
  };
  toolCallCancellation?: {
    ids: string[];
  };
};
