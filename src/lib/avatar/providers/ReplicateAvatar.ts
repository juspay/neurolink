/**
 * Replicate Avatar Handler (MuseTalk default)
 *
 * Routes avatar / lip-sync generation through Replicate's universal
 * prediction lifecycle. Default model is MuseTalk; other lip-sync models
 * (SadTalker, Wav2Lip, etc.) can be selected via `options.model`.
 *
 * @module avatar/providers/ReplicateAvatar
 * @see https://replicate.com/douwantech/musetalk
 */

import { ErrorCategory, ErrorSeverity } from "../../constants/enums.js";
import {
  AVATAR_ERROR_CODES,
  AvatarError,
} from "../../utils/avatarProcessor.js";
import { logger } from "../../utils/logger.js";
import type {
  AvatarHandler,
  AvatarOptions,
  AvatarResult,
  AvatarVideoFormat,
} from "../../types/index.js";
import { getReplicateAuth } from "../../adapters/replicate/auth.js";
import {
  downloadPredictionOutput,
  predict,
} from "../../adapters/replicate/predictionLifecycle.js";
import {
  MAX_AUDIO_BYTES,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  readBoundedBuffer,
} from "../../utils/sizeGuard.js";
import { assertSafeUrl } from "../../utils/ssrfGuard.js";

const DEFAULT_MODEL =
  "douwantech/musetalk:5501004e78525e4bbd9fa20d1e75ad51fddce5a274bec07b9b16d685e34eeaf8";

/**
 * Replicate Avatar Handler.
 *
 * MuseTalk requires both `image` and `audio` inputs — `text`-only is not
 * supported here (use D-ID for that, or chain TTS + this handler).
 */
export class ReplicateAvatar implements AvatarHandler {
  public readonly maxAudioDurationSeconds = 60;
  public readonly supportedFormats: readonly AvatarVideoFormat[] = ["mp4"];

  isConfigured(): boolean {
    return getReplicateAuth() !== null;
  }

  async generate(options: AvatarOptions): Promise<AvatarResult> {
    const auth = getReplicateAuth();
    if (!auth) {
      throw new AvatarError({
        code: AVATAR_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
        message: "REPLICATE_API_TOKEN not configured",
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }

    if (!options.audio) {
      throw new AvatarError({
        code: AVATAR_ERROR_CODES.AUDIO_REQUIRED,
        message:
          "Replicate avatar handler (MuseTalk) requires `audio` (Buffer or path); text-only is not supported. Use D-ID for text-driven talks or chain TTS + Replicate.",
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.MEDIUM,
        retriable: false,
      });
    }

    const startTime = Date.now();
    const model = (options as { model?: string }).model ?? DEFAULT_MODEL;

    const imageBuffer = await this.resolveBuffer(
      options.image,
      MAX_IMAGE_BYTES,
      "Replicate avatar reference image",
    );
    const audioBuffer = await this.resolveBuffer(
      options.audio,
      MAX_AUDIO_BYTES,
      "Replicate avatar reference audio",
    );

    const imageDataUri = `data:image/${this.detectImageType(imageBuffer)};base64,${imageBuffer.toString("base64")}`;
    const audioDataUri = `data:audio/${this.detectAudioType(audioBuffer)};base64,${audioBuffer.toString("base64")}`;

    let prediction: Awaited<ReturnType<typeof predict>>;
    try {
      prediction = await predict(auth, {
        model,
        input: {
          image: imageDataUri,
          audio: audioDataUri,
          bbox_shift: 0,
          fps: 25,
        },
      });
    } catch (err) {
      throw new AvatarError({
        code: AVATAR_ERROR_CODES.GENERATION_FAILED,
        message: `Replicate avatar generation failed: ${err instanceof Error ? err.message : String(err)}`,
        category: ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable: true,
        context: { model },
        originalError: err instanceof Error ? err : undefined,
      });
    }

    let videoBuffer: Buffer;
    try {
      videoBuffer = await downloadPredictionOutput(prediction, MAX_VIDEO_BYTES);
    } catch (err) {
      throw new AvatarError({
        code: AVATAR_ERROR_CODES.GENERATION_FAILED,
        message: `Replicate avatar download failed: ${err instanceof Error ? err.message : String(err)}`,
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        retriable: true,
        context: { predictionId: prediction.id },
        originalError: err instanceof Error ? err : undefined,
      });
    }

    const latency = Date.now() - startTime;
    logger.info(
      `[ReplicateAvatar] Generated ${videoBuffer.length} bytes in ${latency}ms — model ${model}`,
    );

    return {
      buffer: videoBuffer,
      format: "mp4",
      size: videoBuffer.length,
      provider: "replicate",
      metadata: {
        latency,
        provider: "replicate",
        model,
        jobId: prediction.id,
      },
    };
  }

  private async resolveBuffer(
    input: Buffer | string,
    maxBytes: number = MAX_IMAGE_BYTES,
    label: string = "Replicate avatar input",
  ): Promise<Buffer> {
    if (Buffer.isBuffer(input)) {
      if (input.length > maxBytes) {
        throw new AvatarError({
          code: AVATAR_ERROR_CODES.INVALID_INPUT,
          message: `${label} too large: ${input.length} bytes exceeds ${maxBytes}`,
          category: ErrorCategory.VALIDATION,
          severity: ErrorSeverity.HIGH,
          retriable: false,
        });
      }
      return input;
    }
    // Reject local file paths — only Buffer or HTTPS URLs are accepted.
    if (!/^https:\/\//.test(input)) {
      throw new AvatarError({
        code: AVATAR_ERROR_CODES.INVALID_INPUT,
        message: `Invalid input: expected Buffer or HTTPS URL, got string "${input}". Local file reads are not supported.`,
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }
    try {
      await assertSafeUrl(input);
    } catch (err) {
      throw new AvatarError({
        code: AVATAR_ERROR_CODES.INVALID_INPUT,
        message: `Unsafe URL rejected: ${err instanceof Error ? err.message : String(err)}`,
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
        context: { url: input },
      });
    }
    const FETCH_TIMEOUT_MS = 60_000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let r: Response;
    try {
      r = await fetch(input, { signal: controller.signal });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new AvatarError({
          code: AVATAR_ERROR_CODES.INVALID_INPUT,
          message: `Replicate avatar input fetch timed out after ${FETCH_TIMEOUT_MS / 1000}s: ${input}`,
          category: ErrorCategory.NETWORK,
          severity: ErrorSeverity.MEDIUM,
          retriable: true,
        });
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
    if (!r.ok) {
      throw new AvatarError({
        code: AVATAR_ERROR_CODES.INVALID_INPUT,
        message: `Failed to fetch ${input}: ${r.status}`,
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        retriable: r.status >= 500,
      });
    }
    try {
      return await readBoundedBuffer(r, maxBytes, label);
    } catch (err) {
      throw new AvatarError({
        code: AVATAR_ERROR_CODES.INVALID_INPUT,
        message: `${label} too large: ${err instanceof Error ? err.message : String(err)}`,
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
        context: { url: input },
      });
    }
  }

  /**
   * Detect audio MIME subtype from magic bytes.
   *
   * - WAV : "RIFF" header (52 49 46 46)
   * - MP3 : ID3 tag (49 44 33) or sync word 0xFF 0xFB/0xF3/0xF2
   * - OGG : "OggS" capture pattern (4F 67 67 53)
   * - M4A : "ftyp" box at offset 4 (common isom/M4A variant)
   *
   * Falls back to "mp3" when detection is inconclusive.
   */
  private detectAudioType(
    buffer: Buffer,
  ): "mp3" | "wav" | "ogg" | "mp4" | "mpeg" {
    if (buffer.length < 4) {
      return "mp3";
    }
    // WAV: starts with RIFF
    if (
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46
    ) {
      return "wav";
    }
    // OGG: starts with OggS
    if (
      buffer[0] === 0x4f &&
      buffer[1] === 0x67 &&
      buffer[2] === 0x67 &&
      buffer[3] === 0x53
    ) {
      return "ogg";
    }
    // MP3: ID3 header
    if (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) {
      return "mp3";
    }
    // MP3: MPEG sync word (0xFF 0xE0–0xFF)
    if (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) {
      return "mpeg";
    }
    // M4A / AAC: "ftyp" box at offset 4
    if (
      buffer.length >= 8 &&
      buffer[4] === 0x66 &&
      buffer[5] === 0x74 &&
      buffer[6] === 0x79 &&
      buffer[7] === 0x70
    ) {
      return "mp4";
    }
    return "mp3";
  }

  private detectImageType(buffer: Buffer): "png" | "jpeg" | "webp" {
    if (buffer.length < 4) {
      return "jpeg";
    }
    if (buffer[0] === 0x89 && buffer[1] === 0x50) {
      return "png";
    }
    if (buffer[0] === 0xff && buffer[1] === 0xd8) {
      return "jpeg";
    }
    // RIFF container: disambiguate WebP (WEBP at offset 8) from WAV (WAVE at
    // offset 8) so audio data passed as image is not silently misidentified.
    if (
      buffer.length >= 12 &&
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46
    ) {
      // "WEBP" → image/webp
      if (
        buffer[8] === 0x57 &&
        buffer[9] === 0x45 &&
        buffer[10] === 0x42 &&
        buffer[11] === 0x50
      ) {
        return "webp";
      }
      // Any other RIFF type (e.g. WAVE) is not a valid image → fall through to
      // the default so the caller's validation can flag the wrong content type.
      return "jpeg";
    }
    return "jpeg";
  }
}
