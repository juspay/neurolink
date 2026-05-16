/**
 * Replicate Music Handler (MusicGen default)
 *
 * Routes music generation through Replicate's universal prediction
 * lifecycle. Default model is Meta's MusicGen; alternatives include
 * Riffusion, AudioGen, and AudioLDM via `options.model`.
 *
 * @module music/providers/ReplicateMusic
 * @see https://replicate.com/meta/musicgen
 */

import { ErrorCategory, ErrorSeverity } from "../../constants/enums.js";
import { MUSIC_ERROR_CODES, MusicError } from "../../utils/musicProcessor.js";
import { logger } from "../../utils/logger.js";
import type {
  MusicAudioFormat,
  MusicHandler,
  MusicOptions,
  MusicResult,
} from "../../types/index.js";
import { getReplicateAuth } from "../../adapters/replicate/auth.js";
import {
  downloadPredictionOutput,
  predict,
} from "../../adapters/replicate/predictionLifecycle.js";
import { MAX_AUDIO_BYTES, readBoundedBuffer } from "../../utils/sizeGuard.js";
import { assertSafeUrl } from "../../utils/ssrfGuard.js";

const DEFAULT_MODEL =
  "meta/musicgen:7be0f12c54a8d033a0fbd14418c9af98962da9a86f5ff7811f9b3423a1f0b7d7";

export class ReplicateMusic implements MusicHandler {
  public readonly maxDurationSeconds = 30;
  public readonly supportedFormats: readonly MusicAudioFormat[] = [
    "mp3",
    "wav",
  ];
  public readonly supportedGenres: readonly string[] = [
    "ambient",
    "classical",
    "electronic",
    "rock",
    "jazz",
    "hip-hop",
    "pop",
    "lo-fi",
    "cinematic",
    "orchestral",
  ];

  isConfigured(): boolean {
    return getReplicateAuth() !== null;
  }

  async generate(options: MusicOptions): Promise<MusicResult> {
    const auth = getReplicateAuth();
    if (!auth) {
      throw new MusicError({
        code: MUSIC_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
        message: "REPLICATE_API_TOKEN not configured",
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }

    const startTime = Date.now();
    const model = (options as { model?: string }).model ?? DEFAULT_MODEL;
    const requestedFormat: MusicAudioFormat = options.format ?? "mp3";
    const upstreamFormat = this.supportedFormats.includes(requestedFormat)
      ? requestedFormat
      : "mp3";

    // Clamp to provider max and apply default; store as `effectiveDuration`
    // so the returned result always reflects the audio that was actually generated.
    const effectiveDuration = Math.min(
      options.duration ?? 8,
      this.maxDurationSeconds,
    );

    // MusicGen accepts these inputs; other models override via cast.
    const inputPayload: Record<string, unknown> = {
      prompt: this.buildPrompt(options),
      duration: effectiveDuration,
      output_format: upstreamFormat,
      model_version: "stereo-large",
      normalization_strategy: "loudness",
    };

    if (options.tempo !== undefined) {
      inputPayload.bpm = options.tempo;
    }
    if (options.referenceAudio) {
      const ref = await this.resolveBuffer(options.referenceAudio);
      inputPayload.input_audio = `data:audio/${this.detectAudioType(ref)};base64,${ref.toString("base64")}`;
    }

    let prediction: Awaited<ReturnType<typeof predict>>;
    try {
      prediction = await predict(auth, { model, input: inputPayload });
    } catch (err) {
      throw new MusicError({
        code: MUSIC_ERROR_CODES.GENERATION_FAILED,
        message: `Replicate music generation failed: ${err instanceof Error ? err.message : String(err)}`,
        category: ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable: true,
        // Sanitize context: omit raw `options` which may contain large Buffers
        // (referenceAudio) and arbitrary user content.
        context: {
          model,
          duration: effectiveDuration,
          format: upstreamFormat,
          hasReferenceAudio: options.referenceAudio !== undefined,
        },
        originalError: err instanceof Error ? err : undefined,
      });
    }

    let buffer: Buffer;
    try {
      buffer = await downloadPredictionOutput(prediction, MAX_AUDIO_BYTES);
    } catch (err) {
      throw new MusicError({
        code: MUSIC_ERROR_CODES.GENERATION_FAILED,
        message: `Replicate music download failed: ${err instanceof Error ? err.message : String(err)}`,
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        retriable: true,
        context: { predictionId: prediction.id },
        originalError: err instanceof Error ? err : undefined,
      });
    }

    const latency = Date.now() - startTime;
    logger.info(
      `[ReplicateMusic] Generated ${buffer.length} bytes in ${latency}ms — model ${model}`,
    );

    return {
      buffer,
      format: upstreamFormat,
      size: buffer.length,
      // Return the clamped/defaulted duration actually sent to the model,
      // not the raw options.duration which may have been out of bounds or undefined.
      duration: effectiveDuration,
      provider: "replicate",
      metadata: {
        latency,
        provider: "replicate",
        model,
        jobId: prediction.id,
      },
    };
  }

  private buildPrompt(options: MusicOptions): string {
    const parts = [options.prompt];
    if (options.genre) {
      parts.push(`Genre: ${options.genre}`);
    }
    if (options.mood) {
      parts.push(`Mood: ${options.mood}`);
    }
    if (options.tempo !== undefined) {
      parts.push(`${options.tempo} BPM`);
    }
    return parts.join(". ");
  }

  private async resolveBuffer(input: Buffer | string): Promise<Buffer> {
    if (Buffer.isBuffer(input)) {
      return input;
    }
    // Reject local file paths — only Buffer or HTTPS URLs are accepted.
    if (!/^https:\/\//.test(input)) {
      throw new MusicError({
        code: MUSIC_ERROR_CODES.INVALID_INPUT,
        message: `Invalid input: expected Buffer or HTTPS URL, got string "${input}". Local file reads are not supported.`,
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }
    try {
      await assertSafeUrl(input);
    } catch (err) {
      throw new MusicError({
        code: MUSIC_ERROR_CODES.INVALID_INPUT,
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
        throw new MusicError({
          code: MUSIC_ERROR_CODES.GENERATION_FAILED,
          message: `Replicate music reference-audio fetch timed out after ${FETCH_TIMEOUT_MS / 1000}s: ${input}`,
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
      throw new MusicError({
        code: MUSIC_ERROR_CODES.GENERATION_FAILED,
        message: `Failed to fetch reference audio: ${input}: ${r.status}`,
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        retriable: r.status >= 500,
      });
    }
    try {
      return await readBoundedBuffer(
        r,
        MAX_AUDIO_BYTES,
        "Replicate reference audio",
      );
    } catch (err) {
      throw new MusicError({
        code: MUSIC_ERROR_CODES.INVALID_INPUT,
        message: `Replicate reference audio too large: ${err instanceof Error ? err.message : String(err)}`,
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
   * - MP3 : ID3 tag (49 44 33) or MPEG sync word 0xFF 0xEx
   * - OGG : "OggS" capture pattern (4F 67 67 53)
   * - M4A : "ftyp" box at offset 4
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
}
