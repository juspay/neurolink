/**
 * Avatar / Lip-sync Type Definitions
 *
 * Types for generating talking-head videos by combining a portrait image
 * with narration audio (or text routed through a TTS provider first).
 *
 * Avatar is a separate modality from Video — Video is image-to-video
 * (motion synthesis); Avatar is image + audio → lip-synced video.
 *
 * @module types/avatar
 */

/**
 * Output formats for avatar videos.
 */
export type AvatarVideoFormat = "mp4" | "webm" | "mov";

/**
 * Quality presets for avatar generation. Provider-specific mappings:
 *   - D-ID: "standard" → 720p, "hd" → 1080p
 *   - HeyGen: "standard" → 720p, "hd" → 1080p with enhancement
 *   - MuseTalk (Replicate): single quality only; "hd" is no-op
 */
export type AvatarQuality = "standard" | "hd";

/**
 * Known avatar provider identifiers shipped with NeuroLink.
 *
 * `(string & {})` keeps the union open for custom provider names
 * registered via `AvatarProcessor.registerHandler()`.
 */
export type AvatarProviderName =
  | "d-id"
  | "heygen"
  | "replicate"
  | "musetalk"
  | (string & {});

/**
 * Options for avatar video generation.
 */
export type AvatarOptions = {
  /** Source portrait image (Buffer, file path, or HTTPS URL). */
  image: Buffer | string;

  /**
   * Audio source — direct lip-sync.
   * Either provide `audio` OR `text` (with optional `ttsProvider` / `voice`).
   */
  audio?: Buffer | string;

  /**
   * Text for the avatar to speak. When provided without `audio`, the
   * NeuroLink dispatcher first runs TTS (`ttsProvider`) to produce audio,
   * then passes the audio to the avatar handler.
   */
  text?: string;

  /** TTS provider for text → audio when `text` is used. Default: "openai-tts". */
  ttsProvider?: string;

  /** Voice id passed through to the TTS provider when `text` is used. */
  voice?: string;

  /** Avatar provider override (e.g. "d-id", "heygen", "replicate"). */
  provider?: AvatarProviderName;

  /** Output quality preset. */
  quality?: AvatarQuality;

  /** Output format (default: "mp4"). */
  format?: AvatarVideoFormat;

  /** Output file path (optional — buffer is always returned in the result). */
  output?: string;

  /** Per-call timeout in ms (default: 5 minutes). */
  timeout?: number;

  /** Provider-specific additional options. */
  [key: string]: unknown;
};

/**
 * Result of an avatar generation request.
 */
export type AvatarResult = {
  /** Generated video buffer. */
  buffer: Buffer;
  /** Output format. */
  format: AvatarVideoFormat;
  /** File size in bytes. */
  size: number;
  /** Duration in seconds (when reported by the provider). */
  duration?: number;
  /** Provider used. */
  provider?: string;
  /** Performance / request metadata. */
  metadata?: {
    /** Request latency in milliseconds. */
    latency: number;
    /** Provider name. */
    provider?: string;
    /** Model variant used (when applicable). */
    model?: string;
    /** Job / talk identifier from the upstream. */
    jobId?: string;
    /** Any additional provider-specific metadata. */
    [key: string]: unknown;
  };
};

/**
 * Handler contract for avatar / lip-sync providers.
 *
 * Implementations enforce their own timeouts. Recommended:
 *   - Per-request fetch timeout: 30 seconds
 *   - Total job-completion timeout: 5 minutes
 */
export type AvatarHandler = {
  /**
   * Generate a talking-head video from an image + audio (or pre-rendered text).
   */
  generate(options: AvatarOptions): Promise<AvatarResult>;

  /** Validate the provider is configured (auth, base URL, etc.). */
  isConfigured(): boolean;

  /** Maximum supported audio length in seconds (provider-specific). */
  readonly maxAudioDurationSeconds?: number;

  /** Output formats supported by this handler. */
  readonly supportedFormats?: readonly AvatarVideoFormat[];
};

/**
 * Valid avatar video formats — runtime validation array.
 */
export const VALID_AVATAR_FORMATS: readonly AvatarVideoFormat[] = [
  "mp4",
  "webm",
  "mov",
];

// =============================================================================
// PROVIDER-SPECIFIC RESPONSE SHAPES
// =============================================================================

/**
 * D-ID `/talks` API response shape.
 *
 * Used by `DIDAvatar` handler to type-check upstream responses. Lives here
 * (in `src/lib/types/`) per CLAUDE.md rule 2; the handler imports it via
 * the types barrel.
 */
export type DIDTalkResponse = {
  id: string;
  status?: string;
  result_url?: string;
  error?: { kind?: string; description?: string };
  duration?: number;
};

/**
 * HeyGen `/v1/video_status.get` response shape.
 */
export type HeyGenVideoStatusResponse = {
  code?: number;
  data?: {
    id?: string;
    status?: "pending" | "processing" | "completed" | "failed";
    video_url?: string;
    thumbnail_url?: string;
    duration?: number;
    error?: {
      code?: string;
      message?: string;
      detail?: string;
    };
  };
  message?: string;
};
