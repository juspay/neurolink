/**
 * Native audio delivery to providers that can listen.
 *
 * ## The gap this closes
 *
 * Until this module existed, attaching an audio file produced a message
 * containing only a metadata block:
 *
 *   ## Audio File: "recording.mp3"
 *   Duration: 19s | Codec: MPEG 2 Layer 3 | Bitrate: 32 kbps |
 *   Sample Rate: 22050 Hz | Channels: 1 (Mono)
 *
 * No audio bytes were ever handed to the provider. Every question about what
 * the recording *says* — transcribe this, who is speaking, what was agreed —
 * was answered from a description of the file, and Gemini has accepted inline
 * audio the whole time.
 *
 * The failure was invisible for an instructive reason: that metadata block
 * answers precisely the questions a test is most tempted to ask. "How long is
 * this audio?" and "what sample rate is it?" both succeed with no audio
 * attached, so a suite built on them reports working audio support. It took an
 * end-to-end test asking for a spoken word to expose it.
 *
 * ## Provider scope
 *
 * Deliberately a capability map rather than "send audio to everyone". A
 * provider that cannot accept an audio part responds with an opaque HTTP 400,
 * which is worse than the metadata summary it would otherwise have received —
 * so an unlisted provider keeps the existing text-only behaviour and loses
 * nothing.
 *
 * @module adapters/audioFormatSupport
 */

import type { AudioConversionResult } from "../types/index.js";
import { withTimeout } from "../utils/errorHandling.js";
import { logger } from "../utils/logger.js";
import { getFfmpegPath, runFfmpeg } from "./video/ffmpegAdapter.js";

/**
 * Ceiling for one audio conversion.
 *
 * Longer than the image equivalent because a lossless hour-long WAV is a
 * legitimate input and re-encoding it is not instant, but still bounded so a
 * wedged decoder cannot hold a generation request open indefinitely.
 */
const AUDIO_TRANSCODE_TIMEOUT_MS = 120_000;

/**
 * Providers that accept inline audio parts.
 *
 * Google's Gemini models (both Vertex and AI Studio) take audio as `inlineData`
 * alongside text. Other providers are omitted rather than assumed: OpenAI's
 * audio models use a different request shape than the chat-completions path
 * NeuroLink builds here, and sending an audio part to a provider that does not
 * expect one converts a working (if limited) response into a hard failure.
 */
const NATIVE_AUDIO_PROVIDERS: ReadonlySet<string> = new Set([
  "vertex",
  "google-vertex",
  "googlevertex",
  "google-ai-studio",
  "googleaistudio",
  "google-ai",
  "googleai",
  "gemini",
]);

/**
 * Audio MIME types the native providers accept as-is.
 *
 * Gemini's documented set. Anything outside it is transcoded rather than
 * rejected, because the container a user happens to have — a voice memo in
 * CAF, a Windows recording in WMA — says nothing about whether the audio
 * inside is useful.
 */
const NATIVE_AUDIO_MIME_TYPES: ReadonlySet<string> = new Set([
  "audio/wav",
  "audio/x-wav",
  "audio/mpeg",
  "audio/mp3",
  "audio/aiff",
  "audio/x-aiff",
  "audio/aac",
  "audio/ogg",
  "audio/flac",
  "audio/x-flac",
]);

/** MIME type every transcode targets. Universally accepted and compact. */
const TRANSCODE_TARGET_MIME = "audio/mpeg";

/** Whether `provider` can be handed raw audio bytes. */
export function supportsNativeAudio(provider: string): boolean {
  return NATIVE_AUDIO_PROVIDERS.has(provider.toLowerCase().trim());
}

/** Whether `mimeType` must be re-encoded before a native provider will read it. */
export function needsAudioTranscode(mimeType: string): boolean {
  return !NATIVE_AUDIO_MIME_TYPES.has(normalizeAudioMime(mimeType));
}

function normalizeAudioMime(mimeType: string): string {
  return mimeType.split(";")[0].trim().toLowerCase();
}

/**
 * Re-encode audio to MP3 with ffmpeg.
 *
 * Temp files rather than stdin: several of the containers that need converting
 * (CAF, WavPack, AU) carry their metadata in a trailer or require seeking, and
 * a piped stream leaves ffmpeg unable to find it. The directory is removed in
 * `finally` whether or not the conversion succeeded.
 *
 * Node builtins are imported dynamically because the browser bundle stubs
 * `node:fs/promises` without `mkdtemp`; nothing in a browser spawns ffmpeg, so
 * the import belongs at the point of use.
 */
async function transcodeToMp3(
  buffer: Buffer,
  extension: string,
): Promise<Buffer> {
  const [
    { randomUUID },
    { mkdtemp, readFile, rm, writeFile },
    { tmpdir },
    { join },
  ] = await Promise.all([
    import("node:crypto"),
    import("node:fs/promises"),
    import("node:os"),
    import("node:path"),
  ]);
  const workDir = await mkdtemp(join(tmpdir(), "neurolink-audio-"));
  const inputPath = join(workDir, `${randomUUID()}${extension}`);
  const outputPath = join(workDir, `${randomUUID()}.mp3`);
  try {
    await writeFile(inputPath, buffer);
    await runFfmpeg(
      [
        "-y",
        "-v",
        "error",
        "-i",
        inputPath,
        // Downmix and cap the rate: speech is the point, and a 48 kHz stereo
        // re-encode of a mono voice memo triples the payload for nothing.
        "-ac",
        "1",
        "-ar",
        "16000",
        "-c:a",
        "libmp3lame",
        "-q:a",
        "4",
        outputPath,
      ],
      // Without this the call inherits runFfmpeg's frame-extraction default of
      // 30s, which is sized for pulling a single video frame — so the 120s
      // ceiling above, chosen precisely because re-encoding a lossless
      // hour-long WAV is not instant, could never be reached. ffmpeg killed the
      // transcode at 30s and the outer race never got to run.
      { timeoutMs: AUDIO_TRANSCODE_TIMEOUT_MS },
    );
    return await readFile(outputPath);
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

/**
 * Return audio bytes a native provider can read, transcoding when the source
 * container is one it does not accept.
 *
 * Never throws for audio reasons. When conversion is impossible — no ffmpeg, an
 * unreadable stream — the original bytes and MIME type come back with
 * `converted: false`, and the caller falls back to the metadata summary. That
 * keeps this from turning a previously-working (if limited) request into a
 * failure.
 *
 * @param buffer - Raw audio bytes.
 * @param mimeType - Detected MIME type of `buffer`.
 * @param extension - Source extension, used so ffmpeg picks the right demuxer.
 */
export async function toProviderCompatibleAudio(
  buffer: Buffer,
  mimeType: string,
  extension: string,
): Promise<AudioConversionResult> {
  const normalized = normalizeAudioMime(mimeType);
  if (!needsAudioTranscode(normalized)) {
    return { buffer, mimeType: normalized, converted: false };
  }

  // Resolving the binary first turns "ffmpeg is not installed" into one clear
  // warning rather than a spawn error surfacing from inside the conversion.
  const ffmpegAvailable = await getFfmpegPath()
    .then(() => true)
    .catch(() => false);
  if (!ffmpegAvailable) {
    logger.warn(
      `[audioFormatSupport] ${normalized} needs conversion before a provider can ` +
        `read it, but ffmpeg is unavailable — falling back to a metadata-only ` +
        `summary. Install ffmpeg (or set FFMPEG_PATH) to enable this format.`,
    );
    return { buffer, mimeType: normalized, converted: false };
  }

  try {
    const converted = await withTimeout(
      transcodeToMp3(buffer, extension),
      AUDIO_TRANSCODE_TIMEOUT_MS,
      new Error(`audio transcode exceeded ${AUDIO_TRANSCODE_TIMEOUT_MS}ms`),
    );
    if (converted.length === 0) {
      throw new Error("produced an empty audio stream");
    }
    logger.debug(
      `[audioFormatSupport] Transcoded ${normalized} → ${TRANSCODE_TARGET_MIME} ` +
        `(${buffer.length} → ${converted.length} bytes) for native delivery`,
    );
    return {
      buffer: converted,
      mimeType: TRANSCODE_TARGET_MIME,
      converted: true,
    };
  } catch (error) {
    logger.warn(
      `[audioFormatSupport] Could not convert ${normalized} for native delivery ` +
        `— falling back to a metadata-only summary: ` +
        `${error instanceof Error ? error.message.split("\n")[0] : String(error)}`,
    );
    return { buffer, mimeType: normalized, converted: false };
  }
}
