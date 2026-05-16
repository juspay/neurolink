/**
 * D-ID Avatar / Lip-sync Handler
 *
 * Async talking-head generation. Submits a /talks request with a source
 * image and either an audio URL or a text+voice script, polls the talk
 * status, and downloads the resulting MP4.
 *
 * @module avatar/providers/DIDAvatar
 * @see https://docs.d-id.com/reference/talks-overview
 */

import { ErrorCategory, ErrorSeverity } from "../../constants/enums.js";
import type {
  AvatarHandler,
  AvatarOptions,
  AvatarResult,
  AvatarVideoFormat,
  DIDTalkResponse,
} from "../../types/index.js";
import { logger } from "../../utils/logger.js";
import { sanitizeForLog } from "../../utils/logSanitize.js";
import {
  AVATAR_ERROR_CODES,
  AvatarError,
} from "../../utils/avatarProcessor.js";
import { assertSafeUrl } from "../../utils/ssrfGuard.js";
import {
  MAX_AUDIO_BYTES,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  readBoundedBuffer,
} from "../../utils/sizeGuard.js";

const DEFAULT_BASE_URL = "https://api.d-id.com";
const REQUEST_TIMEOUT_MS = 30_000;
const POLL_INTERVAL_MS = 3_000;
const TOTAL_TIMEOUT_MS = 5 * 60_000;

/**
 * D-ID Avatar Handler.
 *
 * Auth: `Authorization: Basic ${DID_API_KEY}` (the API key is
 * already a base64-encoded `username:password` from the D-ID console).
 *
 * Env vars: `DID_API_KEY` (preferred) / `D_ID_API_KEY` (legacy alias).
 */
export class DIDAvatar implements AvatarHandler {
  public readonly maxAudioDurationSeconds = 60;
  public readonly supportedFormats: readonly AvatarVideoFormat[] = ["mp4"];

  private readonly apiKey: string | null;
  private readonly baseUrl: string;

  constructor(apiKey?: string) {
    const resolved = (
      apiKey ??
      process.env.DID_API_KEY ??
      process.env.D_ID_API_KEY ??
      ""
    ).trim();
    this.apiKey = resolved.length > 0 ? resolved : null;
    this.baseUrl = (
      process.env.DID_BASE_URL ??
      process.env.D_ID_BASE_URL ??
      DEFAULT_BASE_URL
    ).replace(/\/$/, "");
  }

  isConfigured(): boolean {
    return this.apiKey !== null;
  }

  async generate(options: AvatarOptions): Promise<AvatarResult> {
    if (!this.apiKey) {
      throw new AvatarError({
        code: AVATAR_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
        message: "DID_API_KEY not configured",
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }

    if (!options.audio && !options.text) {
      throw new AvatarError({
        code: AVATAR_ERROR_CODES.AUDIO_REQUIRED,
        message:
          "D-ID requires either `audio` (Buffer/path) or `text` (with voice id) to drive the talk",
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.MEDIUM,
        retriable: false,
      });
    }

    const startTime = Date.now();

    // 1. Upload image (D-ID needs a hosted URL).
    const sourceUrl = await this.uploadImage(options.image);

    // 2. Optional audio upload.
    const audioUrl = options.audio
      ? await this.uploadAudio(options.audio)
      : undefined;

    // 3. Submit talk.
    const talkId = await this.submitTalk(options, sourceUrl, audioUrl);

    // 4. Poll for completion.
    const completed = await this.pollUntilDone(
      talkId,
      options.timeout ?? TOTAL_TIMEOUT_MS,
      (options as { abortSignal?: AbortSignal }).abortSignal,
    );

    if (!completed.result_url) {
      throw new AvatarError({
        code: AVATAR_ERROR_CODES.GENERATION_FAILED,
        message: `D-ID talk ${talkId} completed but no result_url returned`,
        category: ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
        context: { talkId, completed },
      });
    }

    // 5. Guard the provider-returned URL before fetching (SSRF — same threat
    //    model as caller-supplied URLs: the API response could be tampered).
    try {
      await assertSafeUrl(completed.result_url);
    } catch (err) {
      throw new AvatarError({
        code: AVATAR_ERROR_CODES.GENERATION_FAILED,
        message: `D-ID result_url rejected as unsafe: ${err instanceof Error ? err.message : String(err)}`,
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
        context: { talkId, url: completed.result_url },
      });
    }

    // 6. Download the MP4.
    const buffer = await this.downloadResult(completed.result_url);

    const latency = Date.now() - startTime;
    logger.info(
      `[DIDAvatar] Generated ${buffer.length} bytes in ${latency}ms — talk ${talkId}`,
    );

    return {
      buffer,
      format: "mp4",
      size: buffer.length,
      duration: completed.duration,
      provider: "d-id",
      metadata: {
        latency,
        provider: "d-id",
        jobId: talkId,
      },
    };
  }

  private async uploadImage(image: Buffer | string): Promise<string> {
    // If an HTTPS URL is provided directly, use it (D-ID accepts public URLs).
    if (typeof image === "string" && /^https:\/\//.test(image)) {
      return image;
    }

    const buffer = await this.resolveBuffer(image);

    const form = new FormData();
    form.append(
      "image",
      new Blob([new Uint8Array(buffer)], {
        type: this.detectImageMime(buffer),
      }),
      "source.png",
    );

    const response = await this.fetchWithTimeout(`${this.baseUrl}/images`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${this.apiKey}`,
      },
      body: form,
    });
    const data = (await this.assertOk(response, "image upload")) as {
      url?: string;
    };
    if (!data.url) {
      throw new AvatarError({
        code: AVATAR_ERROR_CODES.GENERATION_FAILED,
        message: "D-ID image upload succeeded but returned no URL",
        category: ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }
    return data.url;
  }

  private async uploadAudio(audio: Buffer | string): Promise<string> {
    if (typeof audio === "string" && /^https:\/\//.test(audio)) {
      return audio;
    }

    const buffer = await this.resolveBuffer(audio);

    const audioSubtype = this.detectAudioType(buffer);
    // Map the detected subtype to a file extension.
    const extMap: Record<string, string> = {
      mp3: "mp3",
      mpeg: "mp3",
      wav: "wav",
      ogg: "ogg",
      mp4: "m4a",
    };
    const ext = extMap[audioSubtype] ?? "mp3";

    const form = new FormData();
    form.append(
      "audio",
      new Blob([new Uint8Array(buffer)], { type: `audio/${audioSubtype}` }),
      `narration.${ext}`,
    );

    const response = await this.fetchWithTimeout(`${this.baseUrl}/audios`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${this.apiKey}`,
      },
      body: form,
    });
    const data = (await this.assertOk(response, "audio upload")) as {
      url?: string;
    };
    if (!data.url) {
      throw new AvatarError({
        code: AVATAR_ERROR_CODES.GENERATION_FAILED,
        message: "D-ID audio upload succeeded but returned no URL",
        category: ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }
    return data.url;
  }

  private async submitTalk(
    options: AvatarOptions,
    sourceUrl: string,
    audioUrl?: string,
  ): Promise<string> {
    const script: Record<string, unknown> = audioUrl
      ? { type: "audio", audio_url: audioUrl }
      : {
          type: "text",
          input: options.text,
          provider: {
            type: "microsoft",
            voice_id: options.voice ?? "en-US-JennyNeural",
          },
        };

    const body: Record<string, unknown> = {
      source_url: sourceUrl,
      script,
      config: {
        result_format: "mp4",
        stitch: true,
      },
    };

    const response = await this.fetchWithTimeout(`${this.baseUrl}/talks`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = (await this.assertOk(
      response,
      "talk submit",
    )) as DIDTalkResponse;
    if (!data.id) {
      throw new AvatarError({
        code: AVATAR_ERROR_CODES.GENERATION_FAILED,
        message: "D-ID talk submit returned no id",
        category: ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }
    return data.id;
  }

  private async pollUntilDone(
    talkId: string,
    totalTimeoutMs: number,
    abortSignal?: AbortSignal,
  ): Promise<DIDTalkResponse> {
    const startTime = Date.now();
    while (Date.now() - startTime < totalTimeoutMs) {
      if (abortSignal?.aborted) {
        throw new AvatarError({
          code: AVATAR_ERROR_CODES.GENERATION_FAILED,
          message: `D-ID poll for talk ${talkId} aborted by caller`,
          category: ErrorCategory.NETWORK,
          severity: ErrorSeverity.MEDIUM,
          retriable: false,
          context: { talkId },
        });
      }

      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/talks/${talkId}`,
        {
          method: "GET",
          headers: { Authorization: `Basic ${this.apiKey}` },
        },
        abortSignal,
      );
      const data = (await this.assertOk(
        response,
        "talk status",
      )) as DIDTalkResponse;

      if (data.status === "done") {
        return data;
      }
      if (data.status === "error" || data.status === "rejected") {
        throw new AvatarError({
          code: AVATAR_ERROR_CODES.GENERATION_FAILED,
          message: `D-ID talk ${talkId} ${data.status}: ${
            data.error?.description ?? "unknown"
          }`,
          category: ErrorCategory.EXECUTION,
          severity: ErrorSeverity.HIGH,
          retriable: false,
          context: { talkId, status: data.status, error: data.error },
        });
      }

      // Abortable sleep.
      await new Promise<void>((resolve, reject) => {
        const onAbort = (): void => {
          clearTimeout(timer);
          reject(
            new AvatarError({
              code: AVATAR_ERROR_CODES.GENERATION_FAILED,
              message: `D-ID poll for talk ${talkId} aborted by caller`,
              category: ErrorCategory.NETWORK,
              severity: ErrorSeverity.MEDIUM,
              retriable: false,
              context: { talkId },
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
      message: `D-ID talk ${talkId} did not complete within ${Math.round(totalTimeoutMs / 1000)}s`,
      category: ErrorCategory.TIMEOUT,
      severity: ErrorSeverity.MEDIUM,
      retriable: true,
      context: { talkId },
    });
  }

  private async downloadResult(url: string): Promise<Buffer> {
    const response = await this.fetchWithTimeout(url, { method: "GET" });
    if (!response.ok) {
      throw new AvatarError({
        code: AVATAR_ERROR_CODES.GENERATION_FAILED,
        message: `D-ID result download failed: ${response.status}`,
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        retriable: response.status >= 500,
        context: { status: response.status, url },
      });
    }
    try {
      return await readBoundedBuffer(response, MAX_VIDEO_BYTES, "D-ID result");
    } catch (err) {
      throw new AvatarError({
        code: AVATAR_ERROR_CODES.GENERATION_FAILED,
        message: `D-ID result download rejected: ${err instanceof Error ? err.message : String(err)}`,
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.HIGH,
        retriable: false,
        context: { url },
        originalError: err instanceof Error ? err : undefined,
      });
    }
  }

  private async resolveBuffer(input: Buffer | string): Promise<Buffer> {
    if (Buffer.isBuffer(input)) {
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
    const response = await this.fetchWithTimeout(input, { method: "GET" });
    if (!response.ok) {
      throw new AvatarError({
        code: AVATAR_ERROR_CODES.INVALID_INPUT,
        message: `Failed to fetch input from ${input}: ${response.status}`,
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        retriable: response.status >= 500,
        context: { url: input, status: response.status },
      });
    }
    // Use the larger of the two input caps (audio 50 MiB > image 25 MiB) so
    // both audio and image URLs are bounded without falsely rejecting valid audio.
    const inputCap = Math.max(MAX_AUDIO_BYTES, MAX_IMAGE_BYTES);
    try {
      return await readBoundedBuffer(response, inputCap, "D-ID input");
    } catch (err) {
      throw new AvatarError({
        code: AVATAR_ERROR_CODES.INVALID_INPUT,
        message: `D-ID input download rejected: ${err instanceof Error ? err.message : String(err)}`,
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.HIGH,
        retriable: false,
        context: { url: input },
        originalError: err instanceof Error ? err : undefined,
      });
    }
  }

  private detectImageMime(buffer: Buffer): string {
    if (buffer.length < 4) {
      return "image/jpeg";
    }
    if (buffer[0] === 0x89 && buffer[1] === 0x50) {
      return "image/png";
    }
    if (buffer[0] === 0xff && buffer[1] === 0xd8) {
      return "image/jpeg";
    }
    // RIFF container: check offset 8 to distinguish WebP from WAV.
    // A WAV file also begins with RIFF but carries "WAVE" at offset 8.
    // If we can't confirm the WEBP four-CC we fall back to jpeg so callers
    // that accidentally pass audio here get a visible mismatch rather than
    // a silent wrong content-type.
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
        return "image/webp";
      }
      // RIFF but not WEBP (e.g. WAVE audio) — not a valid image.
      return "image/jpeg";
    }
    return "image/jpeg";
  }

  /**
   * Detect the audio subtype from magic bytes.
   *
   * Recognised formats:
   * - WAV  : RIFF header (52 49 46 46)
   * - OGG  : OggS capture (4F 67 67 53)
   * - MP3  : ID3 tag (49 44 33) or MPEG sync word (FF Ex)
   * - M4A  : "ftyp" box at offset 4 (ISO base media / M4A)
   *
   * Falls back to "mp3" when detection is inconclusive.
   */
  private detectAudioType(
    buffer: Buffer,
  ): "mp3" | "wav" | "ogg" | "mp4" | "mpeg" {
    if (buffer.length < 4) {
      return "mp3";
    }
    // WAV: RIFF header
    if (
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46
    ) {
      return "wav";
    }
    // OGG: OggS capture pattern
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

  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
    callerAbortSignal?: AbortSignal,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    // Forward caller abort into this request so in-flight polls can be
    // cancelled immediately without waiting for the timeout to fire.
    const onCallerAbort = (): void => controller.abort();
    callerAbortSignal?.addEventListener("abort", onCallerAbort, { once: true });
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        // Distinguish an intentional caller cancellation from an internal
        // timeout so the caller gets the right error semantics.
        if (callerAbortSignal?.aborted) {
          throw new AvatarError({
            code: AVATAR_ERROR_CODES.GENERATION_FAILED,
            message: `D-ID request to ${url} aborted by caller`,
            category: ErrorCategory.NETWORK,
            severity: ErrorSeverity.MEDIUM,
            retriable: false,
            originalError: err,
          });
        }
        throw new AvatarError({
          code: AVATAR_ERROR_CODES.GENERATION_FAILED,
          message: `D-ID request to ${url} timed out after ${REQUEST_TIMEOUT_MS / 1000}s`,
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

  private async assertOk(response: Response, label: string): Promise<unknown> {
    if (response.ok) {
      return response.json();
    }
    const raw = await response.text();
    const retriable =
      response.status === 408 ||
      response.status === 429 ||
      response.status >= 500;
    throw new AvatarError({
      code: AVATAR_ERROR_CODES.GENERATION_FAILED,
      message: `D-ID ${label} failed: ${response.status} — ${sanitizeForLog(raw, 500)}`,
      category: retriable ? ErrorCategory.NETWORK : ErrorCategory.EXECUTION,
      severity: ErrorSeverity.HIGH,
      retriable,
      context: { status: response.status, label },
    });
  }
}
