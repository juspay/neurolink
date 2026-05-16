/**
 * Kling Video Handler (PiAPI)
 *
 * Image-to-video generation via PiAPI's Kling endpoint. Async job model:
 * POST /image-to-video → poll /task/{id} until completed.
 *
 * NOTE: PiAPI Kling requires a publicly accessible image URL, not inline
 * base64 data. Callers must supply `options.imageUrl` (a URL string) when
 * using KlingVideoHandler. The `image` Buffer parameter is still accepted
 * for interface compatibility (e.g., metadata / downstream use) but is not
 * sent to the API. A clear error is thrown if no URL is provided.
 *
 * @module adapters/video/klingVideoHandler
 * @see https://piapi.ai/docs/kling-api
 */

import { ErrorCategory, ErrorSeverity } from "../../constants/enums.js";
import { VIDEO_ERROR_CODES } from "../../constants/videoErrors.js";
import { logger } from "../../utils/logger.js";
import { sanitizeForLog } from "../../utils/logSanitize.js";
import { safeDownload } from "../../utils/safeFetch.js";
import { VideoError } from "../../utils/videoProcessor.js";
import { MAX_VIDEO_BYTES } from "../../utils/sizeGuard.js";
import type {
  KlingTaskResponse,
  VideoGenerationResult,
  VideoHandler,
  VideoOutputOptions,
} from "../../types/index.js";

const DEFAULT_BASE_URL = "https://api.piapi.ai/api/kling/v1";
const REQUEST_TIMEOUT_MS = 30_000;
const POLL_INTERVAL_MS = 5_000;
const TOTAL_TIMEOUT_MS = 5 * 60_000;

/**
 * Kling Video Handler.
 *
 * Auth: `Authorization: Bearer ${KLING_API_KEY}` (PiAPI / Kling key).
 * Models: kling-1.6-i2v (default), kling-1.5-i2v, kling-1.0.
 */
export class KlingVideoHandler implements VideoHandler {
  public readonly maxDurationSeconds = 10;
  public readonly supportedAspectRatios: readonly ("9:16" | "16:9" | "1:1")[] =
    ["16:9", "9:16", "1:1"];
  public readonly supportedResolutions: readonly ("720p" | "1080p")[] = [
    "720p",
    "1080p",
  ];

  private readonly apiKey: string | null;
  private readonly baseUrl: string;

  constructor(apiKey?: string) {
    const resolved = (apiKey ?? process.env.KLING_API_KEY ?? "").trim();
    this.apiKey = resolved.length > 0 ? resolved : null;
    this.baseUrl = (process.env.KLING_BASE_URL ?? DEFAULT_BASE_URL).replace(
      /\/$/,
      "",
    );
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
        message: "KLING_API_KEY not configured",
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }

    if (!options.imageUrl) {
      throw new VideoError({
        code: VIDEO_ERROR_CODES.INVALID_INPUT,
        message:
          "KlingVideoHandler requires a publicly accessible image URL. " +
          "Pass options.imageUrl with a URL string pointing to the input image. " +
          "The PiAPI Kling API does not accept inline base64 image data.",
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }

    const startTime = Date.now();
    const abortSignal = (options as { abortSignal?: AbortSignal }).abortSignal;

    // 1. Submit job.
    const taskId = await this.submitJob(image, prompt, options);

    // 2. Poll until complete.
    const videoUrl = await this.pollUntilComplete(taskId, abortSignal);

    // 3. Download video.
    const buffer = await this.downloadVideo(videoUrl);

    const processingTime = Date.now() - startTime;
    logger.info(
      `[KlingVideoHandler] Generated ${buffer.length} bytes in ${processingTime}ms — task ${taskId}`,
    );

    return {
      data: buffer,
      mediaType: "video/mp4",
      metadata: {
        duration: options.length ?? 4,
        dimensions: this.calculateDimensions(options),
        model: options.model ?? "kling",
        provider: "kling",
        aspectRatio: options.aspectRatio ?? "16:9",
        audioEnabled: false,
        processingTime,
      },
    };
  }

  private async submitJob(
    _image: Buffer,
    prompt: string,
    options: VideoOutputOptions,
  ): Promise<string> {
    // PiAPI Kling requires a publicly accessible URL for the input image.
    // options.imageUrl is validated (non-null) before submitJob is called.
    const body = {
      model: options.model ?? "kling",
      task_type: "video_generation",
      input: {
        image_url: options.imageUrl as string,
        prompt,
        duration: options.length ?? 4,
        aspect_ratio: options.aspectRatio ?? "16:9",
        cfg_scale: 0.5,
      },
    };

    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/image-to-video`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
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
        message: `Kling submit failed: ${response.status} — ${sanitizeForLog(raw, 500)}`,
        category: retriable ? ErrorCategory.NETWORK : ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable,
        context: { status: response.status },
      });
    }

    const json = (await response.json()) as {
      task_id?: string;
      data?: { task_id?: string };
    };
    const taskId = json.task_id ?? json.data?.task_id;
    if (!taskId) {
      throw new VideoError({
        code: VIDEO_ERROR_CODES.GENERATION_FAILED,
        message: "Kling submit response missing task_id",
        category: ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
        context: { response: json },
      });
    }
    return taskId;
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
          message: `Kling poll for task ${taskId} aborted by caller`,
          category: ErrorCategory.NETWORK,
          severity: ErrorSeverity.MEDIUM,
          retriable: false,
          context: { taskId },
        });
      }

      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/task/${taskId}`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${this.apiKey}` },
        },
        abortSignal,
      );
      if (!response.ok) {
        const raw = await response.text();
        throw new VideoError({
          code: VIDEO_ERROR_CODES.GENERATION_FAILED,
          message: `Kling poll failed: ${response.status} — ${sanitizeForLog(raw, 500)}`,
          category: ErrorCategory.NETWORK,
          severity: ErrorSeverity.MEDIUM,
          retriable: response.status >= 500,
          context: { status: response.status, taskId },
        });
      }
      const data = (await response.json()) as KlingTaskResponse;
      if (data.status === "completed" || data.status === "succeeded") {
        const videoUrl = data.video_url ?? data.output?.video_url;
        if (!videoUrl) {
          throw new VideoError({
            code: VIDEO_ERROR_CODES.GENERATION_FAILED,
            message: `Kling task ${taskId} completed but no video URL returned`,
            category: ErrorCategory.EXECUTION,
            severity: ErrorSeverity.HIGH,
            retriable: false,
            context: { taskId, data },
          });
        }
        return videoUrl;
      }
      if (data.status === "failed") {
        throw new VideoError({
          code: VIDEO_ERROR_CODES.GENERATION_FAILED,
          message: `Kling task ${taskId} failed: ${data.error ?? "unknown"}`,
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
              message: `Kling poll for task ${taskId} aborted by caller`,
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
      message: `Kling task ${taskId} did not complete within ${TOTAL_TIMEOUT_MS / 1000}s`,
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
        label: "Kling video",
        timeoutMs: REQUEST_TIMEOUT_MS,
      });
    } catch (err) {
      throw new VideoError({
        code: VIDEO_ERROR_CODES.GENERATION_FAILED,
        message: `Kling video download rejected: ${err instanceof Error ? err.message : String(err)}`,
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
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, REQUEST_TIMEOUT_MS);
    const onCallerAbort = (): void => controller.abort();
    callerAbortSignal?.addEventListener("abort", onCallerAbort, { once: true });
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        if (timedOut) {
          throw new VideoError({
            code: VIDEO_ERROR_CODES.GENERATION_FAILED,
            message: `Kling request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`,
            category: ErrorCategory.NETWORK,
            severity: ErrorSeverity.HIGH,
            retriable: true,
            originalError: err,
          });
        }
        throw new VideoError({
          code: VIDEO_ERROR_CODES.GENERATION_FAILED,
          message: "Kling request aborted by caller",
          category: ErrorCategory.NETWORK,
          severity: ErrorSeverity.MEDIUM,
          retriable: false,
          originalError: err,
        });
      }
      throw err;
    } finally {
      callerAbortSignal?.removeEventListener("abort", onCallerAbort);
      clearTimeout(timeoutId);
    }
  }

  private calculateDimensions(options: VideoOutputOptions): {
    width: number;
    height: number;
  } {
    const aspectRatio = options.aspectRatio ?? "16:9";
    const resolution = options.resolution ?? "720p";

    if (resolution === "1080p") {
      if (aspectRatio === "1:1") {
        return { width: 1080, height: 1080 };
      }
      return aspectRatio === "9:16"
        ? { width: 1080, height: 1920 }
        : { width: 1920, height: 1080 };
    }
    if (aspectRatio === "1:1") {
      return { width: 720, height: 720 };
    }
    return aspectRatio === "9:16"
      ? { width: 720, height: 1280 }
      : { width: 1280, height: 720 };
  }
}
