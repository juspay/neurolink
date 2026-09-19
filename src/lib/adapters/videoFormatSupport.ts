/**
 * Native video delivery to providers that can watch.
 *
 * ## The gap this closes
 *
 * Attaching a video produced a metadata block and a handful of downsampled
 * JPEGs:
 *
 *   ## Video File: "demo.mp4"
 *   Duration: 0:47 | 1920x1080 | avc | 30 fps | 3 keyframes extracted
 *
 * Every provider got the same treatment, Gemini included — and Gemini has
 * accepted inline video, with its audio track, the whole time. A 47-second
 * screen recording reached it as three still frames at 768px, so anything
 * between them (a click, a transition, a spoken sentence) was simply not in
 * the request.
 *
 * Two things make that worse than the equivalent audio gap was. First, the
 * frames come from ffmpeg, and ffmpeg is an optional dependency: on a machine
 * without it `extractKeyframes` returns an empty array and the model receives
 * the metadata line alone — a video attachment that conveys nothing visual at
 * all, with no error. Second, the metadata block answers exactly the questions
 * a test tends to ask ("how long is it?", "what resolution?"), so the failure
 * reads as working support until someone asks what happens in the clip.
 *
 * Delivering the file itself needs no ffmpeg, which is what makes this the
 * fix rather than "extract more frames".
 *
 * ## Provider scope
 *
 * A capability table rather than "send video to everyone". A provider that
 * cannot accept a video part answers with an opaque HTTP 400, which is
 * strictly worse than the metadata-plus-frames summary it would otherwise
 * have received — so an unlisted provider keeps the existing behaviour and
 * loses nothing.
 *
 * ## Why there is no transcode path here
 *
 * `audioFormatSupport` re-encodes a container Gemini will not read, because a
 * voice memo is seconds of audio and the conversion is cheap. The video
 * equivalent is not: re-encoding a half-hour recording is minutes of CPU
 * inside a generation request, for a payload that will usually breach the
 * inline ceiling anyway. An unsupported container therefore falls back to
 * keyframes, which is the behaviour that already existed.
 *
 * @module adapters/videoFormatSupport
 */

import type {
  MultimodalVideoEntry,
  VideoDeliveryDecision,
  VideoProviderConfig,
} from "../types/index.js";

/**
 * Ceiling for one inline video payload, in MB of *source* bytes.
 *
 * Gemini's documented limit is 20 MB for the whole request. Inline data is
 * base64 in a JSON body, which costs 4 bytes per 3, so a 20 MB file arrives as
 * roughly 27 MB of request and is rejected. 15 MB is the largest source size
 * that still fits under 20 MB once encoded, with room left for the prompt and
 * any other attachments sharing the request.
 *
 * Clips above this are not an error — they fall back to keyframe extraction,
 * exactly as before this module existed. Lifting the ceiling properly means
 * wiring the resumable Files API, which is a separate piece of work.
 */
const GEMINI_INLINE_VIDEO_MAX_MB = 15;

/**
 * Longest clip Gemini will reason over natively.
 *
 * In practice the size ceiling above binds first — 15 MB of H.264 is minutes,
 * not an hour — so this is a backstop for the case where it does not: a very
 * low-bitrate or largely static recording can be long and small at once.
 */
const GEMINI_MAX_VIDEO_DURATION_SEC = 3600;

/**
 * Per-provider video handling.
 *
 * Keys are lowercase canonical names and the aliases each provider is
 * addressed by elsewhere in the codebase; `getVideoProviderConfig` normalises
 * before looking up, so a caller never has to know which spelling it holds.
 *
 * Only Google's Gemini front ends carry `supportsNativeVideo: true`. The rest
 * are listed deliberately rather than left to the unknown-provider default:
 * an explicit row is how `getVideoProviderConfig` distinguishes "this provider
 * takes frames" from "nobody has looked at this provider yet", and the frame
 * budgets differ enough between them to be worth stating.
 */
export const VIDEO_PROVIDER_CONFIGS: Readonly<
  Record<string, VideoProviderConfig>
> = Object.freeze({
  // --- Gemini: inline video, audio track included -------------------------
  ...Object.fromEntries(
    [
      "vertex",
      "google-vertex",
      "googlevertex",
      "google-ai-studio",
      "googleaistudio",
      "google-ai",
      "googleai",
      "gemini",
    ].map((name) => [
      name,
      Object.freeze({
        supportsNativeVideo: true,
        apiType: "inline",
        maxSizeMB: GEMINI_INLINE_VIDEO_MAX_MB,
        maxDurationSec: GEMINI_MAX_VIDEO_DURATION_SEC,
        supportsAudio: true,
        // Only consulted on the fallback path — a clip over the inline
        // ceiling. Generous because that clip is by definition a long one.
        recommendedFrameCount: 16,
      } satisfies VideoProviderConfig),
    ]),
  ),

  // --- Frame extraction: vision models with no video part -----------------
  ...Object.fromEntries(
    [
      "openai",
      "azure",
      "anthropic",
      "bedrock",
      "amazon-bedrock",
      "mistral",
      "litellm",
      "openrouter",
      "openai-compatible",
      "huggingface",
      "sagemaker",
      "deepseek",
      "nvidia-nim",
      "lmstudio",
      "cerebras",
      "sambanova",
    ].map((name) => [
      name,
      Object.freeze({
        supportsNativeVideo: false,
        apiType: "frame-extraction",
        maxSizeMB: 0,
        maxDurationSec: 0,
        supportsAudio: false,
        recommendedFrameCount: 8,
      } satisfies VideoProviderConfig),
    ]),
  ),

  // --- Frame extraction on a tighter budget -------------------------------
  // Local runtimes hold every frame in the same memory as the model, so a
  // 16-frame request is the difference between an answer and an OOM.
  ...Object.fromEntries(
    ["ollama", "llamacpp", "llama-cpp"].map((name) => [
      name,
      Object.freeze({
        supportsNativeVideo: false,
        apiType: "frame-extraction",
        maxSizeMB: 0,
        maxDurationSec: 0,
        supportsAudio: false,
        recommendedFrameCount: 4,
      } satisfies VideoProviderConfig),
    ]),
  ),
});

/**
 * Video MIME types Gemini accepts inline.
 *
 * Its documented set. A container outside it is left to keyframe extraction
 * rather than transcoded — see the module header for why.
 */
const NATIVE_VIDEO_MIME_TYPES: ReadonlySet<string> = new Set([
  "video/mp4",
  "video/mpeg",
  "video/mpg",
  "video/mov",
  "video/quicktime",
  "video/avi",
  "video/x-msvideo",
  "video/x-flv",
  "video/webm",
  "video/wmv",
  "video/x-ms-wmv",
  "video/3gpp",
]);

/** Tokens one extracted keyframe costs a vision model, approximately. */
const TOKENS_PER_FRAME = 250;

/**
 * Tokens one second of natively-delivered video costs.
 *
 * Gemini bills video at roughly 258 tokens per second at default resolution
 * (one frame per second plus the audio track). Rounded to 260 — the estimate
 * is for budgeting, and false precision in a constant invites treating it as
 * a quoted price.
 */
const TOKENS_PER_NATIVE_VIDEO_SECOND = 260;

/** Tokens one minute of transcribed speech costs, approximately. */
const TOKENS_PER_TRANSCRIPT_MINUTE = 400;

function normalizeProvider(provider: string): string {
  return provider.toLowerCase().trim();
}

function normalizeVideoMime(mimeType: string): string {
  return mimeType.split(";")[0].trim().toLowerCase();
}

/**
 * The video-handling row for `provider`, or null when there is none.
 *
 * Null means "not described here", which is not the same as "takes frames":
 * an unrecognised provider still receives keyframes, because that is the
 * pipeline's default, but nothing in this table asserts it will understand
 * them. Callers wanting the safe reading should treat null as no native
 * video, which is what {@link supportsNativeVideo} does.
 */
export function getVideoProviderConfig(
  provider: string,
): VideoProviderConfig | null {
  return VIDEO_PROVIDER_CONFIGS[normalizeProvider(provider)] ?? null;
}

/** Whether `provider` can be handed raw video bytes. */
export function supportsNativeVideo(provider: string): boolean {
  return getVideoProviderConfig(provider)?.supportsNativeVideo ?? false;
}

/** Whether `mimeType` is a container a native provider will read as-is. */
export function isNativeVideoMimeType(mimeType: string): boolean {
  return NATIVE_VIDEO_MIME_TYPES.has(normalizeVideoMime(mimeType));
}

/**
 * Rough token cost of putting one video in front of one provider.
 *
 * Two quite different prices, because two quite different payloads: a native
 * provider is billed for the clip's duration, a frame-extraction provider for
 * the frames it is sent. Asking for one number without saying which mode
 * applies is how a budget ends up an order of magnitude out, so the provider
 * decides the formula rather than the caller.
 *
 * An estimate, not a quote — resolution settings, prompt text and provider
 * pricing changes all move the real figure.
 *
 * @param options.provider - Provider the video is destined for.
 * @param options.durationSec - Clip length. 0 when unknown.
 * @param options.frameCount - Frames that would be extracted. Defaults to the
 *   provider's `recommendedFrameCount`, or 8 for an unlisted provider.
 * @param options.hasTranscription - Whether a speech transcript is included.
 *   Ignored for a native provider, which already hears the audio track.
 */
export function estimateVideoTokens(options: {
  provider: string;
  durationSec: number;
  frameCount?: number;
  hasTranscription?: boolean;
}): number {
  const { provider, durationSec, frameCount, hasTranscription } = options;
  const config = getVideoProviderConfig(provider);
  const seconds = Math.max(0, durationSec);

  if (config?.supportsNativeVideo) {
    return Math.ceil(seconds * TOKENS_PER_NATIVE_VIDEO_SECOND);
  }

  const frames = Math.max(0, frameCount ?? config?.recommendedFrameCount ?? 8);
  const transcriptTokens = hasTranscription
    ? Math.ceil(seconds / 60) * TOKENS_PER_TRANSCRIPT_MINUTE
    : 0;
  return frames * TOKENS_PER_FRAME + transcriptTokens;
}

/**
 * Whether one specific clip may go to one specific provider as bytes.
 *
 * Every rejection carries a reason the caller can log verbatim, because the
 * user-visible symptom of all of them is identical — "it only described the
 * file" — and the remedies are not: shorten the clip, re-encode the
 * container, or switch provider.
 *
 * An unknown duration is not a rejection. Probing fails on exotic containers
 * and on machines without ffmpeg, and refusing a 2 MB clip because nothing
 * measured it would reintroduce the frames-only behaviour precisely where
 * frames are least likely to be available.
 */
export function canDeliverVideoNatively(
  provider: string,
  video: MultimodalVideoEntry,
): VideoDeliveryDecision {
  const config = getVideoProviderConfig(provider);
  if (!config?.supportsNativeVideo) {
    return {
      deliver: false,
      reason: `${provider} does not accept video attachments`,
    };
  }

  const mimeType = normalizeVideoMime(video.mimeType);
  if (!isNativeVideoMimeType(mimeType)) {
    return {
      deliver: false,
      reason: `${mimeType} is not a container ${provider} reads inline`,
    };
  }

  const sizeMB = video.buffer.length / (1024 * 1024);
  if (sizeMB > config.maxSizeMB) {
    return {
      deliver: false,
      reason:
        `the clip is ${sizeMB.toFixed(1)}MB, over the ${config.maxSizeMB}MB ` +
        `inline ceiling for ${provider}`,
    };
  }

  if (
    typeof video.durationSec === "number" &&
    Number.isFinite(video.durationSec) &&
    video.durationSec > config.maxDurationSec
  ) {
    return {
      deliver: false,
      reason:
        `the clip runs ${Math.round(video.durationSec)}s, over the ` +
        `${config.maxDurationSec}s ceiling for ${provider}`,
    };
  }

  return { deliver: true };
}
