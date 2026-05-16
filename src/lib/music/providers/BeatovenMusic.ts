/**
 * Beatoven.ai Music Generation Handler
 *
 * Async track-composition API. Submits a compose-track request, polls the
 * task status, and downloads the resulting audio.
 *
 * @module music/providers/BeatovenMusic
 * @see https://www.beatoven.ai/api-docs
 */

import { ErrorCategory, ErrorSeverity } from "../../constants/enums.js";
import type {
  BeatovenComposeResponse,
  BeatovenTaskStatus,
  MusicAudioFormat,
  MusicHandler,
  MusicOptions,
  MusicResult,
} from "../../types/index.js";
import { logger } from "../../utils/logger.js";
import { MUSIC_ERROR_CODES, MusicError } from "../../utils/musicProcessor.js";
import { MAX_AUDIO_BYTES, readBoundedBuffer } from "../../utils/sizeGuard.js";
import { assertSafeUrl } from "../../utils/ssrfGuard.js";

const DEFAULT_BASE_URL = "https://public-api.beatoven.ai";
const REQUEST_TIMEOUT_MS = 30_000;
const POLL_INTERVAL_MS = 3_000;
const TOTAL_TIMEOUT_MS = 5 * 60_000;

/**
 * Beatoven.ai Music Generation Handler.
 *
 * Beatoven is a royalty-free music generation API tuned for
 * background / cinematic / brand music. Tracks are composed
 * asynchronously: submit a prompt, poll the task, then download.
 */
export class BeatovenMusic implements MusicHandler {
  public readonly maxDurationSeconds = 300; // 5 minutes per track
  public readonly supportedFormats: readonly MusicAudioFormat[] = [
    "mp3",
    "wav",
  ];
  public readonly supportedGenres: readonly string[] = [
    "ambient",
    "cinematic",
    "corporate",
    "lo-fi",
    "rock",
    "pop",
    "electronic",
    "orchestral",
    "folk",
  ];

  private readonly apiKey: string | null;
  private readonly baseUrl: string;

  constructor(apiKey?: string) {
    const resolved = (apiKey ?? process.env.BEATOVEN_API_KEY ?? "").trim();
    this.apiKey = resolved.length > 0 ? resolved : null;
    this.baseUrl = (process.env.BEATOVEN_BASE_URL ?? DEFAULT_BASE_URL).replace(
      /\/$/,
      "",
    );
  }

  isConfigured(): boolean {
    return this.apiKey !== null;
  }

  async generate(options: MusicOptions): Promise<MusicResult> {
    if (!this.apiKey) {
      throw new MusicError({
        code: MUSIC_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
        message: "BEATOVEN_API_KEY not configured",
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }

    const startTime = Date.now();
    const requestedFormat: MusicAudioFormat = options.format ?? "mp3";
    if (!this.supportedFormats.includes(requestedFormat)) {
      logger.warn(
        `[BeatovenMusic] Format "${requestedFormat}" not supported — falling back to "mp3"`,
      );
    }
    const upstreamFormat = this.supportedFormats.includes(requestedFormat)
      ? requestedFormat
      : "mp3";

    // 1. Submit compose-track request.
    const compose = await this.submitCompose(options, upstreamFormat);
    const taskId = compose.task_id;

    // 2. Poll until composed or failed.
    const taskResult = await this.pollUntilComposed(
      taskId,
      options.timeout ?? TOTAL_TIMEOUT_MS,
    );

    const trackUrl = taskResult.meta?.track_url;
    if (!trackUrl) {
      throw new MusicError({
        code: MUSIC_ERROR_CODES.GENERATION_FAILED,
        message: `Beatoven task ${taskId} completed but no track_url returned`,
        category: ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
        context: { taskId, taskResult },
      });
    }

    // 3. Download.
    const buffer = await this.downloadTrack(trackUrl);

    const latency = Date.now() - startTime;
    logger.info(
      `[BeatovenMusic] Generated ${buffer.length} bytes (${upstreamFormat}) in ${latency}ms — task ${taskId}`,
    );

    return {
      buffer,
      format: upstreamFormat,
      size: buffer.length,
      duration: taskResult.meta?.duration,
      provider: "beatoven",
      metadata: {
        latency,
        provider: "beatoven",
        model: "beatoven-default",
        jobId: taskId,
        trackId: taskResult.meta?.track_id,
        projectId: taskResult.meta?.project_id,
        requestedFormat: options.format,
      },
    };
  }

  private async submitCompose(
    options: MusicOptions,
    format: MusicAudioFormat,
  ): Promise<BeatovenComposeResponse> {
    const durationMs = (options.duration ?? 60) * 1000;

    const promptParts = [options.prompt];
    if (options.genre) {
      promptParts.push(`Genre: ${options.genre}`);
    }
    if (options.mood) {
      promptParts.push(`Mood: ${options.mood}`);
    }
    if (options.tempo !== undefined) {
      promptParts.push(`Tempo: ${options.tempo} BPM`);
    }

    const body = {
      prompt: { text: promptParts.join(". ") },
      duration: durationMs,
      format,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/api/v1/tracks/compose`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey as string}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new MusicError({
          code: MUSIC_ERROR_CODES.GENERATION_FAILED,
          message: `Beatoven compose request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`,
          category: ErrorCategory.NETWORK,
          severity: ErrorSeverity.HIGH,
          retriable: true,
          originalError: err,
        });
      }
      throw new MusicError({
        code: MUSIC_ERROR_CODES.GENERATION_FAILED,
        message: `Beatoven compose network error: ${err instanceof Error ? err.message : String(err)}`,
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.HIGH,
        retriable: true,
        originalError: err instanceof Error ? err : undefined,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const text = await response.text();
      const retriable =
        response.status === 408 ||
        response.status === 429 ||
        response.status >= 500;
      throw new MusicError({
        code: MUSIC_ERROR_CODES.GENERATION_FAILED,
        message: `Beatoven compose failed: ${response.status} — ${text}`,
        category: retriable ? ErrorCategory.NETWORK : ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable,
        context: { status: response.status, body: text },
      });
    }

    const json = (await response.json()) as BeatovenComposeResponse;
    if (!json.task_id) {
      throw new MusicError({
        code: MUSIC_ERROR_CODES.GENERATION_FAILED,
        message: "Beatoven compose response missing task_id",
        category: ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
        context: { response: json },
      });
    }
    return json;
  }

  private async pollUntilComposed(
    taskId: string,
    totalTimeoutMs: number,
  ): Promise<BeatovenTaskStatus> {
    const startTime = Date.now();
    while (Date.now() - startTime < totalTimeoutMs) {
      const status = await this.fetchTaskStatus(taskId);

      if (status.status === "composed") {
        return status;
      }
      if (status.status === "failed") {
        throw new MusicError({
          code: MUSIC_ERROR_CODES.GENERATION_FAILED,
          message: `Beatoven task ${taskId} failed: ${status.message ?? "unknown"}`,
          category: ErrorCategory.EXECUTION,
          severity: ErrorSeverity.HIGH,
          retriable: false,
          context: { taskId, status },
        });
      }

      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }

    throw new MusicError({
      code: MUSIC_ERROR_CODES.POLL_TIMEOUT,
      message: `Beatoven task ${taskId} did not complete within ${Math.round(totalTimeoutMs / 1000)}s`,
      category: ErrorCategory.TIMEOUT,
      severity: ErrorSeverity.MEDIUM,
      retriable: true,
      context: { taskId, totalTimeoutMs },
    });
  }

  private async fetchTaskStatus(taskId: string): Promise<BeatovenTaskStatus> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/api/v1/tasks/${taskId}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${this.apiKey as string}` },
        signal: controller.signal,
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new MusicError({
          code: MUSIC_ERROR_CODES.GENERATION_FAILED,
          message: `Beatoven status poll timed out after ${REQUEST_TIMEOUT_MS / 1000}s`,
          category: ErrorCategory.NETWORK,
          severity: ErrorSeverity.MEDIUM,
          retriable: true,
          originalError: err,
        });
      }
      throw new MusicError({
        code: MUSIC_ERROR_CODES.GENERATION_FAILED,
        message: `Beatoven status poll network error: ${err instanceof Error ? err.message : String(err)}`,
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        retriable: true,
        originalError: err instanceof Error ? err : undefined,
        context: { taskId },
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const text = await response.text();
      throw new MusicError({
        code: MUSIC_ERROR_CODES.GENERATION_FAILED,
        message: `Beatoven status request failed: ${response.status} — ${text}`,
        category: ErrorCategory.EXECUTION,
        severity: ErrorSeverity.MEDIUM,
        retriable: response.status >= 500,
        context: { status: response.status, taskId },
      });
    }

    return (await response.json()) as BeatovenTaskStatus;
  }

  private async downloadTrack(url: string): Promise<Buffer> {
    try {
      await assertSafeUrl(url);
    } catch (err: unknown) {
      throw new MusicError({
        code: MUSIC_ERROR_CODES.GENERATION_FAILED,
        message: `Beatoven track URL rejected: ${err instanceof Error ? err.message : String(err)}`,
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
        context: { url },
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, { signal: controller.signal });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new MusicError({
          code: MUSIC_ERROR_CODES.GENERATION_FAILED,
          message: `Beatoven track download timed out after ${REQUEST_TIMEOUT_MS / 1000}s`,
          category: ErrorCategory.NETWORK,
          severity: ErrorSeverity.MEDIUM,
          retriable: true,
          originalError: err,
        });
      }
      throw new MusicError({
        code: MUSIC_ERROR_CODES.GENERATION_FAILED,
        message: `Beatoven track download network error: ${err instanceof Error ? err.message : String(err)}`,
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        retriable: true,
        originalError: err instanceof Error ? err : undefined,
        context: { url },
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      throw new MusicError({
        code: MUSIC_ERROR_CODES.GENERATION_FAILED,
        message: `Beatoven track download failed: ${response.status}`,
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        retriable: response.status >= 500,
        context: { status: response.status, url },
      });
    }

    try {
      return await readBoundedBuffer(
        response,
        MAX_AUDIO_BYTES,
        "Beatoven track",
      );
    } catch (err: unknown) {
      throw new MusicError({
        code: MUSIC_ERROR_CODES.GENERATION_FAILED,
        message: `Beatoven track download exceeded size limit: ${err instanceof Error ? err.message : String(err)}`,
        category: ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
        context: { url },
      });
    }
  }
}
