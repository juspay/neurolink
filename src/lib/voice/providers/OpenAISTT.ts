/**
 * OpenAI Whisper Speech-to-Text Handler
 *
 * Implementation of STT using OpenAI's Whisper model.
 *
 * @module voice/providers/OpenAISTT
 */

import { logger } from "../../utils/logger.js";
import { STTError } from "../errors.js";
import type {
  TTSAudioFormat,
  STTCredentials,
  STTHandler,
  STTLanguage,
  STTOptions,
  STTResult,
  WhisperSTTOptions,
  WhisperVerboseResponse,
} from "../../types/index.js";

const OPENAI_STT_DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * OpenAI Whisper Speech-to-Text Handler
 *
 * Supports transcription and translation using OpenAI's Whisper model, and
 * any server that speaks the same `/audio/transcriptions` wire format: vLLM
 * serving an ASR model, LiteLLM, or NeuroLink's diarization sidecar. Point it
 * elsewhere with the `baseUrl` constructor argument or `OPENAI_STT_BASE_URL`;
 * the key then comes from `OPENAI_STT_API_KEY` (falling back to
 * `OPENAI_API_KEY`), so a keyless local server can use a placeholder without
 * touching the real OpenAI credential. Set `OPENAI_STT_TIMEOUT_MS` for long
 * recordings — a local server transcribing a whole meeting needs minutes.
 *
 * @see https://platform.openai.com/docs/api-reference/audio
 */

/**
 * Trailing slashes off a caller-supplied URL, in one linear pass. A `/\/+$/`
 * regex retries from every slash of a long run and is quadratic on hostile
 * input (CodeQL js/polynomial-redos).
 */
function stripTrailingSlashes(url: string): string {
  let end = url.length;
  while (end > 0 && url.charCodeAt(end - 1) === 47) {
    end--;
  }
  return url.slice(0, end);
}

const MIN_TIMEOUT_MS = 1_000;
const MAX_TIMEOUT_MS = 60 * 60 * 1_000;

/**
 * A finite timeout within [1 s, 1 h], else the handler's own default. Written
 * as explicit range checks: the value can come from a request body and ends
 * up in a timer, and a comparison against a constant bound is what static
 * analysis recognises as bounding it.
 */
function clampTimeoutMs(requested: unknown, fallback: number): number {
  if (
    typeof requested !== "number" ||
    !Number.isFinite(requested) ||
    requested <= 0
  ) {
    return fallback;
  }
  if (requested > MAX_TIMEOUT_MS) {
    return MAX_TIMEOUT_MS;
  }
  if (requested < MIN_TIMEOUT_MS) {
    return MIN_TIMEOUT_MS;
  }
  return Math.floor(requested);
}

export class OpenAISTT implements STTHandler {
  private readonly apiKey: string | null;
  private readonly baseUrl: string;
  private readonly defaultTimeoutMs: number;
  /** The `model` sent when the request names none. */
  private readonly defaultModel: string;

  /**
   * Maximum audio duration in seconds (25 minutes)
   */
  public readonly maxAudioDuration = 25 * 60;

  /**
   * Whisper does not support streaming
   */
  public readonly supportsStreaming = false;

  /**
   * @param apiKeyOrCredentials - The `credentials.stt.whisper` slice
   *   (`apiKey`, `baseURL`, `timeoutMs`), or — the original positional form —
   *   an API key. Anything left out falls back to the environment.
   * @param baseUrl - Base URL, positional form only.
   */
  constructor(
    apiKeyOrCredentials?: string | STTCredentials["whisper"],
    baseUrl?: string,
  ) {
    // `typeof x === "string"` narrows the same way with and without
    // strictNullChecks (the react-hooks build runs tsc without it); an
    // `=== undefined` test does not.
    const slice: NonNullable<STTCredentials["whisper"]> =
      typeof apiKeyOrCredentials === "string"
        ? { apiKey: apiKeyOrCredentials, baseURL: baseUrl }
        : { baseURL: baseUrl, ...(apiKeyOrCredentials ?? {}) };
    this.baseUrl = stripTrailingSlashes(
      (
        slice.baseURL ??
        process.env.OPENAI_STT_BASE_URL ??
        OPENAI_STT_DEFAULT_BASE_URL
      ).trim(),
    );
    // A dedicated STT key wins so a local endpoint never borrows the real
    // OpenAI credential; the plain key keeps working for api.openai.com.
    // `OPENAI_API_KEY` is OpenAI's credential and goes only to api.openai.com;
    // a custom base URL takes the dedicated STT key or the slice's own, so a
    // self-hosted or proxied endpoint never receives the real OpenAI key.
    const resolvedKey = (
      slice.apiKey ??
      process.env.OPENAI_STT_API_KEY ??
      (this.isOfficialEndpoint ? process.env.OPENAI_API_KEY : undefined) ??
      ""
    ).trim();
    this.apiKey = resolvedKey.length > 0 ? resolvedKey : null;
    const envTimeout = Number(process.env.OPENAI_STT_TIMEOUT_MS);
    const sliceTimeout =
      "timeoutMs" in slice ? Number(slice.timeoutMs) : Number.NaN;
    this.defaultTimeoutMs =
      Number.isFinite(sliceTimeout) && sliceTimeout > 0
        ? sliceTimeout
        : Number.isFinite(envTimeout) && envTimeout > 0
          ? envTimeout
          : DEFAULT_TIMEOUT_MS;
    this.defaultModel =
      slice.model ?? process.env.OPENAI_STT_MODEL ?? "whisper-1";
  }

  /** True when pointed at OpenAI itself rather than a compatible server. */
  private get isOfficialEndpoint(): boolean {
    return this.baseUrl === OPENAI_STT_DEFAULT_BASE_URL;
  }

  /**
   * OpenAI itself needs a key. A compatible server at another base URL may
   * not (a self-hosted engine on the local network), so a base URL alone
   * configures the handler and the request goes without an Authorization header.
   */
  isConfigured(): boolean {
    return this.apiKey !== null || !this.isOfficialEndpoint;
  }

  getSupportedFormats(): TTSAudioFormat[] {
    // OpenAI Whisper transcription API accepts: flac, m4a, mp3, mp4, mpeg,
    // mpga, oga, ogg, opus, wav, webm. Keep this in sync with TTSAudioFormat
    // — formats not listed in TTSAudioFormat are filtered out by the type.
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
    // Whisper supports 100+ languages
    // Return the most common ones
    return [
      {
        code: "en",
        name: "English",
        supportsDiarization: false,
        supportsPunctuation: true,
      },
      {
        code: "es",
        name: "Spanish",
        supportsDiarization: false,
        supportsPunctuation: true,
      },
      {
        code: "fr",
        name: "French",
        supportsDiarization: false,
        supportsPunctuation: true,
      },
      {
        code: "de",
        name: "German",
        supportsDiarization: false,
        supportsPunctuation: true,
      },
      {
        code: "it",
        name: "Italian",
        supportsDiarization: false,
        supportsPunctuation: true,
      },
      {
        code: "pt",
        name: "Portuguese",
        supportsDiarization: false,
        supportsPunctuation: true,
      },
      {
        code: "ru",
        name: "Russian",
        supportsDiarization: false,
        supportsPunctuation: true,
      },
      {
        code: "ja",
        name: "Japanese",
        supportsDiarization: false,
        supportsPunctuation: true,
      },
      {
        code: "ko",
        name: "Korean",
        supportsDiarization: false,
        supportsPunctuation: true,
      },
      {
        code: "zh",
        name: "Chinese",
        supportsDiarization: false,
        supportsPunctuation: true,
      },
      {
        code: "ar",
        name: "Arabic",
        supportsDiarization: false,
        supportsPunctuation: true,
      },
      {
        code: "hi",
        name: "Hindi",
        supportsDiarization: false,
        supportsPunctuation: true,
      },
    ];
  }

  async transcribe(
    audio: Buffer | ArrayBuffer,
    options: STTOptions = {},
  ): Promise<STTResult> {
    if (!this.isConfigured()) {
      throw STTError.providerNotConfigured("whisper");
    }

    const audioBuffer = Buffer.isBuffer(audio) ? audio : Buffer.from(audio);

    if (audioBuffer.length === 0) {
      throw STTError.audioEmpty("whisper");
    }

    const whisperOptions = options as WhisperSTTOptions;
    const startTime = Date.now();

    try {
      // Prepare form data
      const formData = new FormData();

      // Add audio file - convert Buffer to Uint8Array for compatibility
      const audioBlob = new Blob([new Uint8Array(audioBuffer)], {
        type: this.getMimeType(options.format ?? "wav"),
      });
      formData.append("file", audioBlob, `audio.${options.format ?? "wav"}`);

      // Add model
      formData.append("model", whisperOptions.model ?? this.defaultModel);

      // Add optional parameters. No language (or "auto") leaves detection to
      // the server; sending a guess would pin every request to it.
      const language = options.language?.trim();
      if (language && language.toLowerCase() !== "auto") {
        formData.append("language", language);
      }

      const prompt = OpenAISTT.buildPrompt(
        whisperOptions.prompt,
        options.vocabulary,
      );
      if (prompt) {
        formData.append("prompt", prompt);
      }

      if (whisperOptions.temperature !== undefined) {
        formData.append("temperature", whisperOptions.temperature.toString());
      }

      // Request verbose_json for detailed response
      const responseFormat = whisperOptions.responseFormat ?? "verbose_json";
      formData.append("response_format", responseFormat);

      // Add timestamp granularities for word-level timestamps
      if (options.wordTimestamps && responseFormat === "verbose_json") {
        formData.append("timestamp_granularities[]", "word");
        formData.append("timestamp_granularities[]", "segment");
      }

      // OpenAI's own API rejects fields it does not know, so the diarization
      // switch is sent only to compatible servers that advertise speakers on
      // their segments (e.g. the NeuroLink diarization sidecar).
      if (options.speakerDiarization && !this.isOfficialEndpoint) {
        formData.append("diarize", "true");
        if (options.speakerCount !== undefined) {
          formData.append("max_speakers", String(options.speakerCount));
        }
      }

      // Choose endpoint based on translation option
      const endpoint = whisperOptions.translate
        ? `${this.baseUrl}/audio/translations`
        : `${this.baseUrl}/audio/transcriptions`;

      // A request-supplied timeout is bounded (1 s … 1 h): it reaches a timer,
      // and an unbounded value from a route body could pin a slot for ever
      // or abort at once (CodeQL js/resource-exhaustion).
      const timeoutMs = clampTimeoutMs(
        whisperOptions.timeoutMs,
        this.defaultTimeoutMs,
      );
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      let response: Response;
      try {
        response = await fetch(endpoint, {
          method: "POST",
          headers: this.apiKey
            ? { Authorization: `Bearer ${this.apiKey}` }
            : undefined,
          body: formData,
          signal: controller.signal,
        });
      } catch (fetchErr: unknown) {
        if (fetchErr instanceof Error && fetchErr.name === "AbortError") {
          throw STTError.transcriptionFailed(
            `OpenAI STT request timed out after ${Math.round(timeoutMs / 1000)} seconds`,
            "whisper",
            fetchErr,
          );
        }
        throw fetchErr;
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => Object.create(null) as Record<string, unknown>);
        const errorMessage =
          (errorData as { error?: { message?: string } }).error?.message ||
          `HTTP ${response.status}`;
        // Some OpenAI-compatible servers (vLLM behind a gateway, for one) serve
        // a model that cannot produce `verbose_json` and say so with a 400.
        // Ask once more for plain `json` — the text is what matters; segments
        // and word timings are simply absent — rather than failing the call.
        if (
          response.status === 400 &&
          responseFormat === "verbose_json" &&
          !whisperOptions.responseFormat &&
          /verbose_json|response_format/i.test(errorMessage)
        ) {
          if (logger.shouldLog("debug")) {
            logger.debug(
              "[OpenAISTT] server refused verbose_json; retrying with json",
              { endpoint, errorMessage },
            );
          }
          return this.transcribe(audio, {
            ...options,
            responseFormat: "json",
            wordTimestamps: false,
          } as WhisperSTTOptions);
        }
        throw STTError.transcriptionFailed(errorMessage, "whisper");
      }

      const latency = Date.now() - startTime;

      // Parse response based on format
      if (responseFormat === "text") {
        const text = await response.text();
        return {
          text,
          confidence: 0.95, // Whisper doesn't return confidence
          metadata: {
            latency,
            provider: "whisper",
            model: whisperOptions.model ?? this.defaultModel,
          },
        };
      }

      const data = (await response.json()) as WhisperVerboseResponse;

      // Build result
      const result: STTResult = {
        text: data.text,
        confidence: 0.95, // Whisper doesn't return per-result confidence
        language: data.language,
        duration: data.duration,
        metadata: {
          latency,
          provider: "whisper",
          model: whisperOptions.model ?? this.defaultModel,
          task: data.task,
          ...OpenAISTT.readLanguageExtensions(data),
        },
      };

      // Add word timings if available
      if (data.words && data.words.length > 0) {
        result.words = data.words.map((word) => ({
          word: word.word,
          startTime: word.start,
          endTime: word.end,
        }));
      }

      // Add segments. OpenAI-compatible servers may omit the decoder stats
      // and may label each segment with a speaker; both are passed through.
      if (data.segments && data.segments.length > 0) {
        result.segments = data.segments.map((segment, index) => ({
          index,
          text: segment.text,
          isFinal: true,
          ...(typeof segment.avg_logprob === "number"
            ? { confidence: Math.exp(segment.avg_logprob) } // log prob -> confidence
            : {}),
          startTime: segment.start,
          endTime: segment.end,
          ...(segment.speaker !== undefined
            ? { speaker: segment.speaker }
            : {}),
        }));
      }
      if (data.speakers && data.speakers.length > 0) {
        result.speakers = data.speakers;
      }

      logger.info(
        `[WhisperSTTHandler] Transcribed ${data.duration?.toFixed(1) ?? "?"}s audio in ${latency}ms`,
      );

      return result;
    } catch (err: unknown) {
      if (err instanceof STTError) {
        throw err;
      }

      const errorMessage =
        err instanceof Error ? err.message : String(err || "Unknown error");
      logger.error(`[WhisperSTTHandler] Transcription failed: ${errorMessage}`);
      throw STTError.transcriptionFailed(
        errorMessage,
        "whisper",
        err instanceof Error ? err : undefined,
      );
    }
  }

  /**
   * The context prompt: the caller's own text, then the vocabulary as one
   * sentence. Whisper-style decoders treat the prompt as preceding text, so a
   * plain list of names biases spelling without being read as an instruction.
   */
  private static buildPrompt(
    prompt: string | undefined,
    vocabulary: string[] | undefined,
  ): string | undefined {
    const terms = (vocabulary ?? [])
      .map((term) => term.trim())
      .filter((term) => term.length > 0);
    const parts = [
      prompt?.trim(),
      terms.length > 0 ? `Names and terms used: ${terms.join(", ")}.` : "",
    ].filter((part): part is string => !!part);
    return parts.length > 0 ? parts.join(" ") : undefined;
  }

  /**
   * Optional language-identification fields a self-hosted server may add to
   * `verbose_json`. Each is read only when it has the expected shape; a
   * server that sends none (OpenAI itself) contributes nothing.
   */
  private static readLanguageExtensions(
    data: WhisperVerboseResponse,
  ): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    if (typeof data.language_detected === "boolean") {
      out.languageDetected = data.language_detected;
    }
    if (
      typeof data.language_confidence === "number" &&
      Number.isFinite(data.language_confidence)
    ) {
      out.languageConfidence = data.language_confidence;
    }
    if (Array.isArray(data.language_scores)) {
      const scores = data.language_scores.filter(
        (entry): entry is { language: string; score: number } =>
          typeof entry === "object" &&
          entry !== null &&
          typeof entry.language === "string" &&
          typeof entry.score === "number" &&
          Number.isFinite(entry.score),
      );
      if (scores.length > 0) {
        out.languageScores = scores.map(({ language, score }) => ({
          language,
          score,
        }));
      }
    }
    return out;
  }

  /**
   * Get MIME type for audio format. Whisper auto-detects from headers, but
   * sending a correct MIME helps providers / proxies that sniff Content-Type.
   * Must stay aligned with `getSupportedFormats()`.
   */
  private getMimeType(format: TTSAudioFormat): string {
    const mimeTypes: Partial<Record<TTSAudioFormat, string>> = {
      mp3: "audio/mpeg",
      wav: "audio/wav",
      ogg: "audio/ogg",
      opus: "audio/opus",
      m4a: "audio/mp4",
      flac: "audio/flac",
      webm: "audio/webm",
      mp4: "audio/mp4",
      mpeg: "audio/mpeg",
      mpga: "audio/mpeg",
    };
    return mimeTypes[format] ?? "audio/wav";
  }
}

// Export as named exports for compatibility
export { OpenAISTT as WhisperSTT };
export { OpenAISTT as WhisperSTTHandler };
export { OpenAISTT as OpenAISTTHandler };
