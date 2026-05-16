/**
 * Google Lyria 3 Pro Music Handler
 *
 * Synchronous generation against the Generative Language API. Returns
 * audio inline as base64 in the response.
 *
 * @module music/providers/LyriaMusic
 * @see https://ai.google.dev/gemini-api/docs/music-generation
 */

import { ErrorCategory, ErrorSeverity } from "../../constants/enums.js";
import { MUSIC_ERROR_CODES, MusicError } from "../../utils/musicProcessor.js";
import { logger } from "../../utils/logger.js";
import { sanitizeForLog } from "../../utils/logSanitize.js";
import type {
  LyriaResponse,
  MusicAudioFormat,
  MusicHandler,
  MusicOptions,
  MusicResult,
} from "../../types/index.js";

const DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_MODEL = "lyria-3-pro-preview";
const REQUEST_TIMEOUT_MS = 120_000;

/**
 * Google Lyria 3 Pro Music Handler.
 *
 * Auth: `Authorization: Bearer ${GOOGLE_API_KEY}` or query-string
 * `?key=${GOOGLE_API_KEY}` (the latter is more compatible with the
 * Generative Language endpoints today).
 */
export class LyriaMusic implements MusicHandler {
  public readonly maxDurationSeconds = 30;
  public readonly supportedFormats: readonly MusicAudioFormat[] = ["wav"];
  public readonly supportedGenres: readonly string[] = [
    "ambient",
    "classical",
    "electronic",
    "jazz",
    "rock",
    "pop",
    "lo-fi",
    "cinematic",
    "orchestral",
    "world",
  ];

  private readonly apiKey: string | null;
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(apiKey?: string) {
    const resolved = (
      apiKey ??
      process.env.GOOGLE_AI_LYRIA_API_KEY ??
      process.env.GOOGLE_API_KEY ??
      process.env.GOOGLE_AI_API_KEY ??
      process.env.GEMINI_API_KEY ??
      ""
    ).trim();
    this.apiKey = resolved.length > 0 ? resolved : null;
    this.baseUrl = (process.env.LYRIA_BASE_URL ?? DEFAULT_BASE_URL).replace(
      /\/$/,
      "",
    );
    this.model = process.env.LYRIA_MODEL ?? DEFAULT_MODEL;
  }

  isConfigured(): boolean {
    return this.apiKey !== null;
  }

  async generate(options: MusicOptions): Promise<MusicResult> {
    if (!this.apiKey) {
      throw new MusicError({
        code: MUSIC_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
        message:
          "Lyria requires one of: GOOGLE_API_KEY, GOOGLE_AI_LYRIA_API_KEY, GOOGLE_AI_API_KEY, or GEMINI_API_KEY",
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }

    const startTime = Date.now();
    const duration = Math.min(options.duration ?? 16, this.maxDurationSeconds);

    // Lyria API no longer accepts `audioGenerationOptions` — duration is
    // controlled implicitly by the prompt/model. Only `responseModalities`
    // is allowed under `generationConfig`. Embed duration in the prompt
    // so the model still gets the hint.
    const promptWithDuration = `${this.buildPrompt(options)}. Duration: ${duration} seconds`;
    const body = {
      contents: [
        {
          parts: [
            {
              text: promptWithDuration,
            },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ["AUDIO"],
      },
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(
        `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        },
      );
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new MusicError({
          code: MUSIC_ERROR_CODES.GENERATION_FAILED,
          message: `Lyria request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`,
          category: ErrorCategory.NETWORK,
          severity: ErrorSeverity.HIGH,
          retriable: true,
          originalError: err,
        });
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const rawText = await response.text();
      const retriable =
        response.status === 408 ||
        response.status === 429 ||
        response.status >= 500;
      throw new MusicError({
        code: MUSIC_ERROR_CODES.GENERATION_FAILED,
        message: `Lyria generation failed: ${response.status} — ${sanitizeForLog(rawText)}`,
        category: retriable ? ErrorCategory.NETWORK : ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable,
        context: { status: response.status },
      });
    }

    const data = (await response.json()) as LyriaResponse;
    const audioPart = data.candidates?.[0]?.content?.parts?.find((p) =>
      p.inlineData?.mimeType?.startsWith("audio/"),
    );

    if (!audioPart?.inlineData?.data) {
      throw new MusicError({
        code: MUSIC_ERROR_CODES.GENERATION_FAILED,
        message: "Lyria response missing audio data",
        category: ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
        context: { response: data },
      });
    }

    const buffer = Buffer.from(audioPart.inlineData.data, "base64");
    const latency = Date.now() - startTime;
    logger.info(
      `[LyriaMusic] Generated ${buffer.length} bytes in ${latency}ms — model ${this.model}`,
    );

    return {
      buffer,
      format: "wav",
      size: buffer.length,
      duration,
      provider: "lyria",
      metadata: {
        latency,
        provider: "lyria",
        model: this.model,
        sampleRate: 48_000,
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
}
