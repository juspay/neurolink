/**
 * Runway Video Handler (Gen-3 Alpha / Gen-4 Turbo)
 *
 * Async generation: POST /v1/image_to_video → poll /v1/tasks/{id}.
 *
 * @module adapters/video/runwayVideoHandler
 * @see https://docs.dev.runwayml.com/api/
 */

import { ErrorCategory, ErrorSeverity } from "../../constants/enums.js";
import { VIDEO_ERROR_CODES } from "../../constants/videoErrors.js";
import { logger } from "../../utils/logger.js";
import { sanitizeForLog } from "../../utils/logSanitize.js";
import { safeDownload } from "../../utils/safeFetch.js";
import { VideoError } from "../../utils/videoProcessor.js";
import { MAX_VIDEO_BYTES } from "../../utils/sizeGuard.js";
import type {
  RunwayTaskResponse,
  VideoGenerationResult,
  VideoHandler,
  VideoOutputOptions,
} from "../../types/index.js";

const DEFAULT_BASE_URL = "https://api.dev.runwayml.com/v1";
const REQUEST_TIMEOUT_MS = 30_000;
const POLL_INTERVAL_MS = 5_000;
const TOTAL_TIMEOUT_MS = 5 * 60_000;

/**
 * Runway Video Handler.
 *
 * Auth: `Authorization: Bearer ${RUNWAY_API_KEY}` + `X-Runway-Version`
 * header. Models: gen3a_turbo (Gen-3 Alpha Turbo, default), gen4_turbo.
 */
export class RunwayVideoHandler implements VideoHandler {
  public readonly maxDurationSeconds = 10;
  public readonly supportedAspectRatios: readonly ("16:9" | "9:16")[] = [
    "16:9",
    "9:16",
  ];
  public readonly supportedResolutions: readonly ("720p" | "1080p")[] = [
    "720p",
    "1080p",
  ];

  private readonly apiKey: string | null;
  private readonly baseUrl: string;
  private readonly apiVersion: string;

  constructor(apiKey?: string) {
    const resolved = (apiKey ?? process.env.RUNWAY_API_KEY ?? "").trim();
    this.apiKey = resolved.length > 0 ? resolved : null;
    this.baseUrl = (process.env.RUNWAY_BASE_URL ?? DEFAULT_BASE_URL).replace(
      /\/$/,
      "",
    );
    this.apiVersion = process.env.RUNWAY_API_VERSION ?? "2024-11-06";
  }

  isConfigured(): boolean {
    return this.apiKey !== null;
  }

  async generate(
    image: Buffer,
    prompt: string,
    options: VideoOutputOptions,
  ): Promise<VideoGenerationResult> {
    if (!this.apiKey) {
      throw new VideoError({
        code: VIDEO_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
        message: "RUNWAY_API_KEY not configured",
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }

    if (
      options.aspectRatio !== undefined &&
      !this.supportedAspectRatios.includes(
        options.aspectRatio as "16:9" | "9:16",
      )
    ) {
      throw new VideoError({
        code: VIDEO_ERROR_CODES.INVALID_INPUT,
        message: `Unsupported aspect ratio for Runway: "${options.aspectRatio}". Supported: ${this.supportedAspectRatios.join(", ")}.`,
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.MEDIUM,
        retriable: false,
        context: {
          requested: options.aspectRatio,
          supported: this.supportedAspectRatios,
        },
      });
    }

    const startTime = Date.now();
    const abortSignal = (options as { abortSignal?: AbortSignal }).abortSignal;
    const taskId = await this.submitTask(image, prompt, options);
    const videoUrl = await this.pollUntilComplete(taskId, abortSignal);
    const buffer = await this.downloadVideo(videoUrl);

    const processingTime = Date.now() - startTime;
    logger.info(
      `[RunwayVideoHandler] Generated ${buffer.length} bytes in ${processingTime}ms — task ${taskId}`,
    );

    return {
      data: buffer,
      mediaType: "video/mp4",
      metadata: {
        duration: options.length ?? 4,
        dimensions: this.calculateDimensions(options),
        model: options.model ?? "gen3a_turbo",
        provider: "runway",
        aspectRatio: options.aspectRatio ?? "16:9",
        audioEnabled: false,
        processingTime,
      },
    };
  }

  private async submitTask(
    image: Buffer,
    prompt: string,
    options: VideoOutputOptions,
  ): Promise<string> {
    const dataUri = `data:image/${this.detectImageType(image)};base64,${image.toString("base64")}`;

    const body = {
      model: options.model ?? "gen3a_turbo",
      promptImage: dataUri,
      promptText: prompt,
      duration: options.length ?? 4,
      ratio: options.aspectRatio === "9:16" ? "9:16" : "16:9",
      seed: undefined,
    };

    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/image_to_video`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "X-Runway-Version": this.apiVersion,
        },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const raw = await response.text();
      const retriable =
        response.status === 408 ||
        response.status === 429 ||
        response.status >= 500;
      throw new VideoError({
        code: VIDEO_ERROR_CODES.GENERATION_FAILED,
        message: `Runway submit failed: ${response.status} — ${sanitizeForLog(raw, 500)}`,
        category: retriable ? ErrorCategory.NETWORK : ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable,
        context: { status: response.status },
      });
    }

    const json = (await response.json()) as { id?: string };
    if (!json.id) {
      throw new VideoError({
        code: VIDEO_ERROR_CODES.GENERATION_FAILED,
        message: "Runway submit response missing id",
        category: ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
        context: { response: json },
      });
    }
    return json.id;
  }

  private async pollUntilComplete(
    taskId: string,
    abortSignal?: AbortSignal,
  ): Promise<string> {
    const startTime = Date.now();
    while (Date.now() - startTime < TOTAL_TIMEOUT_MS) {
      if (abortSignal?.aborted) {
        throw new VideoError({
          code: VIDEO_ERROR_CODES.GENERATION_FAILED,
          message: `Runway poll for task ${taskId} aborted by caller`,
          category: ErrorCategory.NETWORK,
          severity: ErrorSeverity.MEDIUM,
          retriable: false,
          context: { taskId },
        });
      }

      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/tasks/${taskId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "X-Runway-Version": this.apiVersion,
          },
        },
        abortSignal,
      );
      if (!response.ok) {
        const raw = await response.text();
        throw new VideoError({
          code: VIDEO_ERROR_CODES.GENERATION_FAILED,
          message: `Runway poll failed: ${response.status} — ${sanitizeForLog(raw, 500)}`,
          category: ErrorCategory.NETWORK,
          severity: ErrorSeverity.MEDIUM,
          retriable: response.status >= 500,
        });
      }
      const data = (await response.json()) as RunwayTaskResponse;
      if (data.status === "SUCCEEDED" || data.status === "succeeded") {
        const url = Array.isArray(data.output) ? data.output[0] : data.output;
        if (typeof url !== "string") {
          throw new VideoError({
            code: VIDEO_ERROR_CODES.GENERATION_FAILED,
            message: `Runway task ${taskId} completed but no output URL`,
            category: ErrorCategory.EXECUTION,
            severity: ErrorSeverity.HIGH,
            retriable: false,
            context: { taskId, data },
          });
        }
        return url;
      }
      if (data.status === "FAILED" || data.status === "failed") {
        throw new VideoError({
          code: VIDEO_ERROR_CODES.GENERATION_FAILED,
          message: `Runway task ${taskId} failed: ${data.failure ?? data.error ?? "unknown"}`,
          category: ErrorCategory.EXECUTION,
          severity: ErrorSeverity.HIGH,
          retriable: false,
          context: { taskId, data },
        });
      }

      // Abortable sleep.
      await new Promise<void>((resolve, reject) => {
        const onAbort = (): void => {
          clearTimeout(timer);
          reject(
            new VideoError({
              code: VIDEO_ERROR_CODES.GENERATION_FAILED,
              message: `Runway poll for task ${taskId} aborted by caller`,
              category: ErrorCategory.NETWORK,
              severity: ErrorSeverity.MEDIUM,
              retriable: false,
              context: { taskId },
            }),
          );
        };
        const timer = setTimeout(() => {
          abortSignal?.removeEventListener("abort", onAbort);
          resolve();
        }, POLL_INTERVAL_MS);
        abortSignal?.addEventListener("abort", onAbort, { once: true });
      });
    }

    throw new VideoError({
      code: VIDEO_ERROR_CODES.POLL_TIMEOUT,
      message: `Runway task ${taskId} did not complete within ${TOTAL_TIMEOUT_MS / 1000}s`,
      category: ErrorCategory.TIMEOUT,
      severity: ErrorSeverity.MEDIUM,
      retriable: true,
      context: { taskId },
    });
  }

  private async downloadVideo(url: string): Promise<Buffer> {
    try {
      return await safeDownload(url, {
        maxBytes: MAX_VIDEO_BYTES,
        label: "Runway video",
        timeoutMs: REQUEST_TIMEOUT_MS,
      });
    } catch (err) {
      throw new VideoError({
        code: VIDEO_ERROR_CODES.GENERATION_FAILED,
        message: `Runway video download rejected: ${err instanceof Error ? err.message : String(err)}`,
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.HIGH,
        retriable: false,
        context: { url },
        originalError: err instanceof Error ? err : undefined,
      });
    }
  }

  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
    callerAbortSignal?: AbortSignal,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const onCallerAbort = (): void => controller.abort();
    callerAbortSignal?.addEventListener("abort", onCallerAbort, { once: true });
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new VideoError({
          code: VIDEO_ERROR_CODES.GENERATION_FAILED,
          message: `Runway request to ${url} timed out after ${REQUEST_TIMEOUT_MS / 1000}s`,
          category: ErrorCategory.NETWORK,
          severity: ErrorSeverity.HIGH,
          retriable: true,
          originalError: err,
        });
      }
      throw new VideoError({
        code: VIDEO_ERROR_CODES.GENERATION_FAILED,
        message: `Runway fetch failed: ${err instanceof Error ? err.message : String(err)}`,
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.HIGH,
        retriable: true,
        originalError: err instanceof Error ? err : undefined,
      });
    } finally {
      callerAbortSignal?.removeEventListener("abort", onCallerAbort);
      clearTimeout(timeoutId);
    }
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
    // RIFF container: check offset 8 to distinguish WebP from WAV so audio
    // data passed as image is not silently misidentified as WebP.
    if (
      buffer.length >= 12 &&
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46
    ) {
      if (
        buffer[8] === 0x57 &&
        buffer[9] === 0x45 &&
        buffer[10] === 0x42 &&
        buffer[11] === 0x50
      ) {
        return "webp";
      }
      // RIFF but not WEBP (e.g. WAVE audio) — not a valid image.
      return "jpeg";
    }
    return "jpeg";
  }

  private calculateDimensions(options: VideoOutputOptions): {
    width: number;
    height: number;
  } {
    const aspectRatio = options.aspectRatio ?? "16:9";
    const resolution = options.resolution ?? "720p";

    if (resolution === "1080p") {
      return aspectRatio === "9:16"
        ? { width: 1080, height: 1920 }
        : { width: 1920, height: 1080 };
    }
    return aspectRatio === "9:16"
      ? { width: 720, height: 1280 }
      : { width: 1280, height: 720 };
  }
}
