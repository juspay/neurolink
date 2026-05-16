/**
 * Music Generation Type Definitions
 *
 * Types for music / sound-effect generation across providers (Beatoven,
 * ElevenLabs Music, Lyria, Replicate-hosted MusicGen / Riffusion / AudioGen).
 *
 * Music is a separate modality from TTS — TTS produces voiced speech with
 * prosody; Music produces melodic / harmonic / textural audio.
 *
 * @module types/music
 */

/**
 * Output audio formats supported across music providers.
 */
export type MusicAudioFormat = "mp3" | "wav" | "flac" | "ogg";

/**
 * Music genre — provider-specific, free-text accepted.
 *
 * Common genres: "ambient", "cinematic", "rock", "pop", "jazz", "classical",
 * "electronic", "lo-fi", "hip-hop", "orchestral", "synthwave", "folk".
 */
export type MusicGenre = string;

/**
 * Music mood — provider-specific, free-text accepted.
 *
 * Common moods: "uplifting", "melancholic", "tense", "calm", "energetic",
 * "mysterious", "romantic", "epic".
 */
export type MusicMood = string;

/**
 * Options for music generation requests.
 */
export type MusicOptions = {
  /** Text prompt describing the music to generate (required). */
  prompt: string;

  /** Target duration in seconds. Provider-clamped to its supported range. */
  duration?: number;

  /** Output format (default: "mp3"). */
  format?: MusicAudioFormat;

  /** Genre hint (e.g. "ambient", "cinematic"). */
  genre?: MusicGenre;

  /** Mood / emotion hint (e.g. "uplifting", "tense"). */
  mood?: MusicMood;

  /** Tempo in BPM (provider-specific support). */
  tempo?: number;

  /** Override the music provider (e.g. "beatoven", "elevenlabs-music", "lyria", "replicate"). */
  provider?: string;

  /** Reference audio for melody / style guidance (Buffer or path). */
  referenceAudio?: Buffer | string;

  /** Output file path (optional — buffer is always returned in result). */
  output?: string;

  /** Per-call timeout in ms (default: 5 minutes). */
  timeout?: number;

  /** Provider-specific additional options. */
  [key: string]: unknown;
};

/**
 * Result of a music generation request.
 */
export type MusicResult = {
  /** Generated audio buffer. */
  buffer: Buffer;
  /** Output format. */
  format: MusicAudioFormat;
  /** File size in bytes. */
  size: number;
  /** Duration in seconds (when reported by the provider). */
  duration?: number;
  /** Provider used for generation. */
  provider?: string;
  /** Performance / request metadata. */
  metadata?: {
    /** Request latency in milliseconds. */
    latency: number;
    /** Provider name. */
    provider?: string;
    /** Model variant used (when applicable). */
    model?: string;
    /** Sample rate (when known). */
    sampleRate?: number;
    /** Bit rate (when known). */
    bitRate?: number;
    /** Track / job identifier from the upstream. */
    jobId?: string;
    /** Any additional provider-specific metadata. */
    [key: string]: unknown;
  };
};

/**
 * Handler contract for music-generation providers.
 *
 * Implementations enforce their own timeouts. Recommended:
 *   - Per-request fetch timeout: 30 seconds
 *   - Total job-completion timeout: 5 minutes
 */
export type MusicHandler = {
  /**
   * Generate a music track from prompt + options.
   *
   * @param options - prompt, duration, format, genre, mood, etc.
   */
  generate(options: MusicOptions): Promise<MusicResult>;

  /**
   * Validate the provider is configured (auth, base URL, etc.).
   */
  isConfigured(): boolean;

  /** Maximum supported track duration in seconds (provider-specific). */
  readonly maxDurationSeconds?: number;

  /** Output formats supported by this handler. */
  readonly supportedFormats?: readonly MusicAudioFormat[];

  /** Genres / styles the upstream advertises (informational). */
  readonly supportedGenres?: readonly string[];
};

/**
 * Valid music audio formats — runtime validation array.
 */
export const VALID_MUSIC_FORMATS: readonly MusicAudioFormat[] = [
  "mp3",
  "wav",
  "flac",
  "ogg",
];

// =============================================================================
// PROVIDER-SPECIFIC RESPONSE SHAPES
// =============================================================================

/**
 * Beatoven.ai task status response.
 *
 * Used by `BeatovenMusic` handler to type-check polling responses.
 */
export type BeatovenTaskStatus = {
  status: "composing" | "running" | "composed" | "failed";
  meta?: {
    track_url?: string;
    project_id?: string;
    track_id?: string;
    duration?: number;
  };
  message?: string;
};

/**
 * Beatoven.ai compose-track submit response.
 */
export type BeatovenComposeResponse = {
  task_id: string;
  status?: string;
};

/**
 * Google Lyria 3 Pro :generateContent response shape.
 *
 * The audio comes back as a part with `inlineData: { mimeType, data }`
 * where `data` is base64-encoded WAV.
 */
export type LyriaResponse = {
  candidates?: {
    content?: {
      parts?: {
        inlineData?: {
          mimeType?: string;
          data?: string;
        };
        text?: string;
      }[];
    };
    finishReason?: string;
    index?: number;
  }[];
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
};
