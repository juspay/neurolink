/**
 * HeyGen Avatar Handler
 *
 * Async talking-head generation. Submits a video.generate request, polls
 * the video status, downloads the result MP4.
 *
 * @module avatar/providers/HeyGenAvatar
 * @see https://docs.heygen.com/reference/avatar-video
 */

import { ErrorCategory, ErrorSeverity } from "../../constants/enums.js";
import {
  AVATAR_ERROR_CODES,
  AvatarError,
} from "../../utils/avatarProcessor.js";
import { logger } from "../../utils/logger.js";
import { sanitizeForLog } from "../../utils/logSanitize.js";
import type {
  AvatarHandler,
  AvatarOptions,
  AvatarResult,
  AvatarVideoFormat,
  HeyGenVideoStatusResponse,
} from "../../types/index.js";
import { safeDownload } from "../../utils/safeFetch.js";
import { MAX_VIDEO_BYTES } from "../../utils/sizeGuard.js";

const DEFAULT_BASE_URL = "https://api.heygen.com/v2";
const REQUEST_TIMEOUT_MS = 30_000;
const POLL_INTERVAL_MS = 5_000;
const TOTAL_TIMEOUT_MS = 5 * 60_000;

/**
 * HeyGen Avatar Handler.
 *
 * Auth: `X-API-Key: ${HEYGEN_API_KEY}`. The HeyGen API expects an
 * `avatar_id` (HeyGen's own avatar catalog) — pass it via `options.voice`
 * for legacy callers, or `options.avatarId` for explicit users.
 */
export class HeyGenAvatar implements AvatarHandler {
  public readonly maxAudioDurationSeconds = 300; // 5 minutes
  public readonly supportedFormats: readonly AvatarVideoFormat[] = ["mp4"];

  private readonly apiKey: string | null;
  private readonly baseUrl: string;

  constructor(apiKey?: string) {
    const resolved = (apiKey ?? process.env.HEYGEN_API_KEY ?? "").trim();
    this.apiKey = resolved.length > 0 ? resolved : null;
    this.baseUrl = (process.env.HEYGEN_BASE_URL ?? DEFAULT_BASE_URL).replace(
      /\/$/,
      "",
    );
  }

  isConfigured(): boolean {
    return this.apiKey !== null;
  }

  async generate(options: AvatarOptions): Promise<AvatarResult> {
    if (!this.apiKey) {
      throw new AvatarError({
        code: AVATAR_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
        message: "HEYGEN_API_KEY not configured",
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }

    if (!options.text && !options.audio) {
      throw new AvatarError({
        code: AVATAR_ERROR_CODES.AUDIO_REQUIRED,
        message: "HeyGen requires either `text` or `audio` to drive the avatar",
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.MEDIUM,
        retriable: false,
      });
    }

    const startTime = Date.now();
    const abortSignal = (options as { abortSignal?: AbortSignal }).abortSignal;
    const videoId = await this.submitVideo(options);
    const videoUrl = await this.pollUntilComplete(videoId, abortSignal);
    const buffer = await this.download(videoUrl);

    const latency = Date.now() - startTime;
    logger.info(
      `[HeyGenAvatar] Generated ${buffer.length} bytes in ${latency}ms — video ${videoId}`,
    );

    return {
      buffer,
      format: "mp4",
      size: buffer.length,
      provider: "heygen",
      metadata: {
        latency,
        provider: "heygen",
        jobId: videoId,
      },
    };
  }

  private async submitVideo(options: AvatarOptions): Promise<string> {
    const heyOpts = options as AvatarOptions & {
      avatarId?: string;
      backgroundColor?: string;
      width?: number;
      height?: number;
    };
    const avatarId =
      heyOpts.avatarId ??
      (typeof options.image === "string" &&
      /^[a-zA-Z0-9_-]{20,}$/.test(options.image)
        ? options.image // use image string as avatar_id when it looks like one
        : undefined);

    if (!avatarId) {
      throw new AvatarError({
        code: AVATAR_ERROR_CODES.INVALID_INPUT,
        message:
          "HeyGen requires `avatarId` (HeyGen avatar catalog id). Pass via options.avatarId or as options.image with a valid HeyGen id.",
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.MEDIUM,
        retriable: false,
      });
    }

    if (options.audio !== undefined) {
      if (Buffer.isBuffer(options.audio)) {
        throw new AvatarError({
          code: AVATAR_ERROR_CODES.INVALID_INPUT,
          message:
            "HeyGen requires a publicly accessible audio URL; got a binary Buffer. Upload the audio to a hosted location and pass the HTTPS URL instead.",
          category: ErrorCategory.VALIDATION,
          severity: ErrorSeverity.MEDIUM,
          retriable: false,
        });
      }
      if (
        typeof options.audio !== "string" ||
        !/^https?:\/\//i.test(options.audio)
      ) {
        throw new AvatarError({
          code: AVATAR_ERROR_CODES.INVALID_INPUT,
          message:
            "HeyGen requires a publicly accessible HTTPS audio URL; got an unsupported audio input type. Upload the audio to a hosted location and pass the HTTPS URL instead.",
          category: ErrorCategory.VALIDATION,
          severity: ErrorSeverity.MEDIUM,
          retriable: false,
        });
      }
    }

    const voiceConfig = options.audio
      ? {
          type: "audio",
          audio_url: options.audio as string,
        }
      : {
          type: "text",
          input_text: options.text,
          voice_id: options.voice ?? "1bd001e7e50f421d891986aad5158bc8",
        };

    const body = {
      video_inputs: [
        {
          character: {
            type: "avatar",
            avatar_id: avatarId,
            avatar_style: "normal",
          },
          voice: voiceConfig,
          background: {
            type: "color",
            value: heyOpts.backgroundColor ?? "#FFFFFF",
          },
        },
      ],
      dimension: {
        width: heyOpts.width ?? 1280,
        height: heyOpts.height ?? 720,
      },
    };

    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/video/generate`,
      {
        method: "POST",
        headers: {
          "X-API-Key": this.apiKey as string,
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
      throw new AvatarError({
        code: AVATAR_ERROR_CODES.GENERATION_FAILED,
        message: `HeyGen submit failed: ${response.status} — ${sanitizeForLog(raw, 500)}`,
        category: retriable ? ErrorCategory.NETWORK : ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable,
        context: { status: response.status },
      });
    }

    const json = (await response.json()) as { data?: { video_id?: string } };
    const videoId = json.data?.video_id;
    if (!videoId) {
      throw new AvatarError({
        code: AVATAR_ERROR_CODES.GENERATION_FAILED,
        message: "HeyGen submit response missing video_id",
        category: ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
        context: { response: json },
      });
    }
    return videoId;
  }

  private async pollUntilComplete(
    videoId: string,
    abortSignal?: AbortSignal,
  ): Promise<string> {
    const startTime = Date.now();
    // HeyGen status endpoint is on v1, not v2.
    const statusBaseUrl = this.baseUrl.replace(/\/v2$/, "/v1");
    while (Date.now() - startTime < TOTAL_TIMEOUT_MS) {
      if (abortSignal?.aborted) {
        throw new AvatarError({
          code: AVATAR_ERROR_CODES.GENERATION_FAILED,
          message: `HeyGen poll for video ${videoId} aborted by caller`,
          category: ErrorCategory.NETWORK,
          severity: ErrorSeverity.MEDIUM,
          retriable: false,
          context: { videoId },
        });
      }

      const response = await this.fetchWithTimeout(
        `${statusBaseUrl}/video_status.get?video_id=${videoId}`,
        {
          method: "GET",
          headers: { "X-API-Key": this.apiKey as string },
        },
        abortSignal,
      );
      if (!response.ok) {
        const raw = await response.text();
        throw new AvatarError({
          code: AVATAR_ERROR_CODES.GENERATION_FAILED,
          message: `HeyGen poll failed: ${response.status} — ${sanitizeForLog(raw, 500)}`,
          category: ErrorCategory.NETWORK,
          severity: ErrorSeverity.MEDIUM,
          retriable: response.status >= 500,
          context: { status: response.status, videoId },
        });
      }
      const data = (await response.json()) as HeyGenVideoStatusResponse;
      if (data.data?.status === "completed") {
        const videoUrl = data.data.video_url;
        if (!videoUrl) {
          throw new AvatarError({
            code: AVATAR_ERROR_CODES.GENERATION_FAILED,
            message: `HeyGen video ${videoId} completed but no URL returned`,
            category: ErrorCategory.EXECUTION,
            severity: ErrorSeverity.HIGH,
            retriable: false,
            context: { videoId, data },
          });
        }
        return videoUrl;
      }
      if (data.data?.status === "failed") {
        throw new AvatarError({
          code: AVATAR_ERROR_CODES.GENERATION_FAILED,
          message: `HeyGen video ${videoId} failed: ${data.data?.error?.message ?? "unknown"}`,
          category: ErrorCategory.EXECUTION,
          severity: ErrorSeverity.HIGH,
          retriable: false,
          context: { videoId, data },
        });
      }

      // Abortable sleep.
      await new Promise<void>((resolve, reject) => {
        const onAbort = (): void => {
          clearTimeout(timer);
          reject(
            new AvatarError({
              code: AVATAR_ERROR_CODES.GENERATION_FAILED,
              message: `HeyGen poll for video ${videoId} aborted by caller`,
              category: ErrorCategory.NETWORK,
              severity: ErrorSeverity.MEDIUM,
              retriable: false,
              context: { videoId },
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

    throw new AvatarError({
      code: AVATAR_ERROR_CODES.POLL_TIMEOUT,
      message: `HeyGen video ${videoId} did not complete within ${TOTAL_TIMEOUT_MS / 1000}s`,
      category: ErrorCategory.TIMEOUT,
      severity: ErrorSeverity.MEDIUM,
      retriable: true,
      context: { videoId },
    });
  }

  private async download(url: string): Promise<Buffer> {
    try {
      return await safeDownload(url, {
        maxBytes: MAX_VIDEO_BYTES,
        label: "HeyGen video",
        timeoutMs: REQUEST_TIMEOUT_MS,
      });
    } catch (err) {
      throw new AvatarError({
        code: AVATAR_ERROR_CODES.GENERATION_FAILED,
        message: `HeyGen video download rejected: ${err instanceof Error ? err.message : String(err)}`,
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
        // Check caller abort first — a cancelled request is not a timeout.
        if (callerAbortSignal?.aborted) {
          throw new AvatarError({
            code: AVATAR_ERROR_CODES.GENERATION_FAILED,
            message: `HeyGen request to ${url} was aborted by the caller`,
            category: ErrorCategory.NETWORK,
            severity: ErrorSeverity.MEDIUM,
            retriable: false,
            originalError: err,
          });
        }
        if (timedOut) {
          throw new AvatarError({
            code: AVATAR_ERROR_CODES.GENERATION_FAILED,
            message: `HeyGen request to ${url} timed out after ${REQUEST_TIMEOUT_MS / 1000}s`,
            category: ErrorCategory.NETWORK,
            severity: ErrorSeverity.HIGH,
            retriable: true,
            originalError: err,
          });
        }
        // Generic abort (shouldn't happen, but surface it).
        throw new AvatarError({
          code: AVATAR_ERROR_CODES.GENERATION_FAILED,
          message: `HeyGen request to ${url} was aborted`,
          category: ErrorCategory.NETWORK,
          severity: ErrorSeverity.HIGH,
          retriable: true,
          originalError: err,
        });
      }
      throw err;
    } finally {
      callerAbortSignal?.removeEventListener("abort", onCallerAbort);
      clearTimeout(timeoutId);
    }
  }
}
