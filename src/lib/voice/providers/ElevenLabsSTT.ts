/**
 * ElevenLabs Speech-to-Text (Scribe) Handler
 *
 * Batch transcription via `POST /v1/speech-to-text`. Shares the
 * `ELEVENLABS_API_KEY` / `ELEVENLABS_BASE_URL` environment with the ElevenLabs
 * TTS and music handlers — same account, different endpoint.
 *
 * @module voice/providers/ElevenLabsSTT
 */

import { logger } from "../../utils/logger.js";
import { STTError } from "../errors.js";
import type {
  TTSAudioFormat,
  ElevenLabsSTTModel,
  ElevenLabsSTTOptions,
  ElevenLabsSTTResponse,
  ElevenLabsSTTWord,
  STTConfidenceSource,
  STTCredentials,
  STTHandler,
  STTLanguage,
  STTOptions,
  STTResult,
  WordTiming,
} from "../../types/index.js";

const PROVIDER = "elevenlabs-stt";
const DEFAULT_BASE_URL = "https://api.elevenlabs.io/v1";
const DEFAULT_TIMEOUT_MS = 60_000;
/** Largest delay `setTimeout` honours; above it the timer fires at once. */
const MAX_TIMEOUT_MS = 2_147_483_647;
/** `scribe_v1` is deprecated in ElevenLabs' model list; v2 is the current batch model. */
const DEFAULT_MODEL: ElevenLabsSTTModel = "scribe_v2";

/**
 * ElevenLabs Scribe Speech-to-Text Handler
 *
 * Batch-only (no `transcribeStream`). Word timings and speaker labels come
 * back on every response when the audio has them; `diarize` asks Scribe to
 * attribute words to speakers.
 *
 * @see https://elevenlabs.io/docs/api-reference/speech-to-text/convert
 */
export class ElevenLabsSTT implements STTHandler {
  private readonly apiKey: string | null;
  private readonly baseUrl: string;
  private readonly defaultTimeoutMs: number;

  /** Scribe accepts files up to 1 GB / ~4.5 hours; 2 hours is a conservative cap. */
  public readonly maxAudioDuration = 7200;

  public readonly supportsStreaming = false;

  /**
   * @param apiKeyOrCredentials - The `credentials.stt.elevenlabs` slice
   *   (`apiKey`, `baseURL`, `timeoutMs`), or an API key (the original
   *   positional form). The environment fills whatever is left out:
   *   `ELEVENLABS_API_KEY`, and `ELEVENLABS_STT_BASE_URL` before the
   *   account-wide `ELEVENLABS_BASE_URL`.
   */
  constructor(apiKeyOrCredentials?: string | STTCredentials["elevenlabs"]) {
    // `typeof x === "string"` narrows the same way with and without
    // strictNullChecks (the react-hooks build runs tsc without it); an
    // `=== undefined` test does not.
    const slice: NonNullable<STTCredentials["elevenlabs"]> =
      typeof apiKeyOrCredentials === "string"
        ? { apiKey: apiKeyOrCredentials }
        : (apiKeyOrCredentials ?? {});
    const resolvedKey = (
      slice.apiKey ??
      process.env.ELEVENLABS_API_KEY ??
      ""
    ).trim();
    this.apiKey = resolvedKey.length > 0 ? resolvedKey : null;
    this.baseUrl = ElevenLabsSTT.normalizeBaseUrl(
      ("baseURL" in slice ? slice.baseURL : undefined) ??
        process.env.ELEVENLABS_STT_BASE_URL ??
        process.env.ELEVENLABS_BASE_URL ??
        DEFAULT_BASE_URL,
    );
    const sliceTimeout = "timeoutMs" in slice ? slice.timeoutMs : undefined;
    this.defaultTimeoutMs = ElevenLabsSTT.validTimeout(sliceTimeout)
      ? Math.min(sliceTimeout, MAX_TIMEOUT_MS)
      : DEFAULT_TIMEOUT_MS;
  }

  isConfigured(): boolean {
    return this.apiKey !== null;
  }

  getSupportedFormats(): TTSAudioFormat[] {
    return [
      "mp3",
      "wav",
      "ogg",
      "opus",
      "m4a",
      "flac",
      "webm",
      "mp4",
      "mpeg",
      "mpga",
    ];
  }

  async getSupportedLanguages(): Promise<STTLanguage[]> {
    // Scribe auto-detects among 99 languages; this is the commonly requested subset.
    return [
      {
        code: "en",
        name: "English",
        supportsDiarization: true,
        supportsPunctuation: true,
      },
      {
        code: "es",
        name: "Spanish",
        supportsDiarization: true,
        supportsPunctuation: true,
      },
      {
        code: "fr",
        name: "French",
        supportsDiarization: true,
        supportsPunctuation: true,
      },
      {
        code: "de",
        name: "German",
        supportsDiarization: true,
        supportsPunctuation: true,
      },
      {
        code: "it",
        name: "Italian",
        supportsDiarization: true,
        supportsPunctuation: true,
      },
      {
        code: "pt",
        name: "Portuguese",
        supportsDiarization: true,
        supportsPunctuation: true,
      },
      {
        code: "hi",
        name: "Hindi",
        supportsDiarization: true,
        supportsPunctuation: true,
      },
      {
        code: "ja",
        name: "Japanese",
        supportsDiarization: true,
        supportsPunctuation: true,
      },
      {
        code: "ko",
        name: "Korean",
        supportsDiarization: true,
        supportsPunctuation: true,
      },
      {
        code: "zh",
        name: "Chinese",
        supportsDiarization: true,
        supportsPunctuation: true,
      },
      {
        code: "ar",
        name: "Arabic",
        supportsDiarization: true,
        supportsPunctuation: true,
      },
    ];
  }

  async transcribe(
    audio: Buffer | ArrayBuffer,
    options: STTOptions = {},
  ): Promise<STTResult> {
    if (!this.apiKey) {
      throw STTError.providerNotConfigured(PROVIDER);
    }

    const audioBuffer = Buffer.isBuffer(audio) ? audio : Buffer.from(audio);
    if (audioBuffer.length === 0) {
      throw STTError.audioEmpty(PROVIDER);
    }

    const elevenOptions = options as ElevenLabsSTTOptions;
    const model = elevenOptions.model ?? DEFAULT_MODEL;
    const format = options.format ?? "wav";
    const startTime = Date.now();

    try {
      const formData = new FormData();
      formData.append(
        "file",
        new Blob([new Uint8Array(audioBuffer)], {
          type: this.getMimeType(format),
        }),
        `audio.${format}`,
      );
      formData.append("model_id", model);
      // Only forward a language the caller actually set: Scribe auto-detects
      // otherwise, and an injected default would pin every request to one
      // language. (STTProcessor passes options through untouched, so a caller
      // who leaves `language` unset reaches here with it unset.)
      if (
        options.language &&
        options.language.trim().toLowerCase() !== "auto"
      ) {
        formData.append(
          "language_code",
          this.toScribeLanguageCode(options.language),
        );
      }
      // ElevenLabs defaults this to true; a plain transcript is the better
      // default for text that feeds a prompt.
      formData.append(
        "tag_audio_events",
        String(elevenOptions.tagAudioEvents ?? false),
      );
      const diarize =
        options.speakerDiarization ?? options.diarization ?? false;
      formData.append("diarize", String(diarize));
      if (diarize && options.speakerCount !== undefined) {
        formData.append("num_speakers", String(options.speakerCount));
      }

      const baseUrl = elevenOptions.baseUrl
        ? ElevenLabsSTT.normalizeBaseUrl(elevenOptions.baseUrl)
        : this.baseUrl;
      const timeoutMs = ElevenLabsSTT.validTimeout(elevenOptions.timeoutMs)
        ? Math.min(elevenOptions.timeoutMs, MAX_TIMEOUT_MS)
        : this.defaultTimeoutMs;

      // The timer covers the response headers AND the JSON body: a server
      // that stalls mid-body used to hold the transcription — and the
      // generate() it fed — until undici's own ~5-minute body timeout, long
      // after `timeoutMs` had passed.
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      const timedOut = (err: unknown): STTError | undefined =>
        err instanceof Error && err.name === "AbortError"
          ? STTError.transcriptionFailed(
              `ElevenLabs STT request timed out after ${timeoutMs}ms`,
              PROVIDER,
              err,
            )
          : undefined;
      let data: ElevenLabsSTTResponse;
      try {
        let response: Response;
        try {
          response = await fetch(`${baseUrl}/speech-to-text`, {
            method: "POST",
            headers: { "xi-api-key": this.apiKey },
            body: formData,
            signal: controller.signal,
          });
        } catch (fetchErr: unknown) {
          throw timedOut(fetchErr) ?? fetchErr;
        }

        if (!response.ok) {
          // A body that PARSES to `null` isn't caught by `.catch()`, and
          // `.detail` on `null` throws — see ElevenLabsTTS.ts's identical fix.
          const errorData =
            (await response.json().catch(() => null)) ??
            (Object.create(null) as Record<string, unknown>);
          const detail = (
            errorData as { detail?: { message?: string } | string }
          ).detail;
          const errorMessage =
            (typeof detail === "string" ? detail : detail?.message) ||
            `HTTP ${response.status}`;
          const failure = STTError.transcriptionFailed(errorMessage, PROVIDER);
          // `transcriptionFailed` defaults to retriable; a 4xx (bad audio, bad
          // key, unsupported option) can never succeed on resend.
          throw new STTError({
            code: failure.code,
            message: failure.message,
            category: failure.category,
            severity: failure.severity,
            retriable: ElevenLabsSTT.isRetriableStatus(response.status),
            context: { provider: PROVIDER, status: response.status },
          });
        }

        try {
          data = (await response.json()) as ElevenLabsSTTResponse;
        } catch (bodyErr: unknown) {
          throw (
            timedOut(bodyErr) ??
            STTError.transcriptionFailed(
              `ElevenLabs STT response body failed: ${
                bodyErr instanceof Error ? bodyErr.message : String(bodyErr)
              }`,
              PROVIDER,
              bodyErr instanceof Error ? bodyErr : undefined,
            )
          );
        }
      } finally {
        clearTimeout(timeoutId);
      }
      const latency = Date.now() - startTime;
      const result = this.toSTTResult(data, model, latency);

      logger.info(
        `[ElevenLabsSTTHandler] Transcribed ${audioBuffer.length} bytes in ${latency}ms`,
      );

      return result;
    } catch (err: unknown) {
      if (err instanceof STTError) {
        throw err;
      }
      const errorMessage =
        err instanceof Error ? err.message : String(err || "Unknown error");
      logger.error(
        `[ElevenLabsSTTHandler] Transcription failed: ${errorMessage}`,
      );
      throw STTError.transcriptionFailed(
        errorMessage,
        PROVIDER,
        err instanceof Error ? err : undefined,
      );
    }
  }

  private toSTTResult(
    data: ElevenLabsSTTResponse,
    model: ElevenLabsSTTModel,
    latency: number,
  ): STTResult {
    const spoken = (data.words ?? []).filter(
      (word): word is ElevenLabsSTTWord & { text: string } =>
        typeof word.text === "string" &&
        word.type !== "spacing" &&
        word.type !== "audio_event" &&
        word.text.trim().length > 0,
    );

    // `confidence` is required on STTResult, so it is always a number — but
    // which number is recorded, never guessed at. The transcript confidence
    // proper is the mean per-word `exp(logprob)`, the same conversion
    // Whisper's `avg_logprob` gets. When no word carries a logprob the field
    // falls back to `language_probability` — how sure Scribe is about the
    // LANGUAGE, not the words: garbled and clean audio both score ~0.99 on
    // it — and when that is missing too it is 0. `metadata.confidenceSource`
    // names the one used, and `languageProbability` is always kept under its
    // own name so a caller can tell the two apart.
    const wordConfidence = ElevenLabsSTT.meanWordConfidence(spoken);
    const languageProbability = ElevenLabsSTT.unitInterval(
      data.language_probability,
    );
    let confidence: number;
    let confidenceSource: STTConfidenceSource;
    if (wordConfidence !== undefined) {
      confidence = wordConfidence;
      confidenceSource = "word_logprobs";
    } else if (languageProbability !== undefined) {
      confidence = languageProbability;
      confidenceSource = "language_probability";
    } else {
      confidence = 0;
      confidenceSource = "none";
    }

    const result: STTResult = {
      text: data.text ?? "",
      confidence,
      language: data.language_code,
      metadata: {
        latency,
        provider: PROVIDER,
        model,
        confidenceSource,
        languageProbability: data.language_probability,
      },
    };

    if (spoken.length > 0) {
      const speakers = new Set<string>();
      result.words = spoken.map((word): WordTiming => {
        if (word.speaker_id) {
          speakers.add(word.speaker_id);
        }
        return {
          word: word.text,
          startTime: word.start,
          endTime: word.end,
          speaker: word.speaker_id,
        };
      });
      if (speakers.size > 0) {
        result.speakers = [...speakers];
      }
      const last = spoken[spoken.length - 1];
      if (typeof last?.end === "number") {
        result.duration = last.end;
      }
    }

    return result;
  }

  /** A usable timeout: a finite, positive number of milliseconds. */
  private static validTimeout(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value) && value > 0;
  }

  /** A finite number clamped to [0, 1]; `undefined` for anything else. */
  private static unitInterval(value: unknown): number | undefined {
    return typeof value === "number" && Number.isFinite(value)
      ? Math.min(1, Math.max(0, value))
      : undefined;
  }

  /** Mean `exp(logprob)` over the words that carry a finite one, clamped to [0, 1]; `undefined` when none does. */
  private static meanWordConfidence(
    words: readonly ElevenLabsSTTWord[],
  ): number | undefined {
    let sum = 0;
    let count = 0;
    for (const word of words) {
      if (typeof word.logprob === "number" && Number.isFinite(word.logprob)) {
        sum += Math.exp(word.logprob);
        count += 1;
      }
    }
    return count === 0 ? undefined : Math.min(1, Math.max(0, sum / count));
  }

  /** Scribe takes ISO 639-1/3 codes; a BCP-47 tag like `en-US` or `pt_BR` is reduced to its primary subtag. */
  private toScribeLanguageCode(language: string): string {
    return (language.trim().split(/[-_]/, 1)[0] ?? language).toLowerCase();
  }

  private getMimeType(format: TTSAudioFormat): string {
    const mimeTypes: Partial<Record<TTSAudioFormat, string>> = {
      mp3: "audio/mpeg",
      mpeg: "audio/mpeg",
      mpga: "audio/mpeg",
      wav: "audio/wav",
      ogg: "audio/ogg",
      opus: "audio/ogg",
      m4a: "audio/mp4",
      mp4: "audio/mp4",
      flac: "audio/flac",
      webm: "audio/webm",
    };
    return mimeTypes[format] ?? "application/octet-stream";
  }

  /** 429 and 5xx are worth a resend; every other status is a fixed error. */
  private static isRetriableStatus(status: number): boolean {
    return status === 429 || status >= 500;
  }

  private static normalizeBaseUrl(baseUrl: string): string {
    // A loop rather than /\/+$/: the input is caller-supplied and CodeQL
    // flags that regex as polynomial on long runs of "/".
    let end = baseUrl.length;
    while (end > 0 && baseUrl.charCodeAt(end - 1) === 47) {
      end--;
    }
    return baseUrl.slice(0, end);
  }
}
