/**
 * Google Cloud Text-to-Speech Handler
 *
 * Handler for Google Cloud Text-to-Speech API integration.
 *
 * @module adapters/tts/googleTTSHandler
 * @see https://cloud.google.com/text-to-speech/docs
 */
import type { TextToSpeechClient } from "@google-cloud/text-to-speech";
import { TTSError, TTS_ERROR_CODES } from "../../utils/ttsProcessor.js";
import type {
  TTSGender,
  GoogleAudioEncoding,
  GoogleStreamingAudioEncoding,
  TTSAudioFormat,
  TTSChunk,
  TTSOptions,
  TTSResult,
  TTSVoice,
  TTSVoiceType,
  TTSHandler,
} from "../../types/index.js";
import { ErrorCategory, ErrorSeverity } from "../../constants/enums.js";
import { logger } from "../../utils/logger.js";
import { attachStreamCancel } from "../../utils/streamCancellation.js";
import {
  SpanSerializer,
  SpanType,
  SpanStatus,
  getMetricsAggregator,
} from "../../observability/index.js";

export class GoogleTTSHandler implements TTSHandler {
  private client: TextToSpeechClient | null = null;
  private voicesCache: { voices: TTSVoice[]; timestamp: number } | null = null;
  private static readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Google Cloud TTS maximum input size.
   * ~5000 bytes INCLUDING SSML tags.
   */
  private static readonly DEFAULT_MAX_TEXT_LENGTH = 5000;

  /**
   * Default timeout for Google Cloud TTS API calls (milliseconds)
   *
   * Google typically responds within:
   * - 1–5 seconds for short or normal text
   * - 5–10 seconds for longer text or Neural2 voices
   */
  private static readonly DEFAULT_API_TIMEOUT_MS = 30 * 1000;

  /**
   * Maximum text length supported by Google Cloud TTS (in bytes).
   *
   * NOTE:
   * Validation against this limit is performed by the shared TTS processor
   * before invoking provider handlers, not inside this class.
   */
  public readonly maxTextLength: number =
    GoogleTTSHandler.DEFAULT_MAX_TEXT_LENGTH;

  private readonly credentialsPath: string | undefined;

  constructor(credentialsPath?: string) {
    this.credentialsPath =
      credentialsPath ?? process.env.GOOGLE_APPLICATION_CREDENTIALS;
  }

  /**
   * Validate that the provider is properly configured
   *
   * @returns True if provider can generate TTS
   */
  isConfigured(): boolean {
    return this.credentialsPath !== undefined;
  }

  /**
   * Lazily construct (and cache) the Google Cloud TTS client.
   *
   * `@google-cloud/text-to-speech` is an optional dependency: importing it
   * only happens here, on first actual use, so a handler instance can be
   * constructed (e.g. during auto-registration at module load) without the
   * package being installed.
   */
  private async getClient(): Promise<TextToSpeechClient> {
    if (!this.client) {
      const { TextToSpeechClient } =
        await import("@google-cloud/text-to-speech");
      this.client = new TextToSpeechClient({
        keyFilename: this.credentialsPath,
      });
    }
    return this.client;
  }

  /**
   * Get available voices for the provider
   *
   * Note: This method is optional in the TTSHandler interface, but Google Cloud TTS
   * fully implements it to provide comprehensive voice discovery capabilities.
   *
   * @param languageCode - Optional language filter (e.g., "en-US")
   * @returns List of available voices
   */
  async getVoices(languageCode?: string): Promise<TTSVoice[]> {
    if (!this.isConfigured()) {
      throw new TTSError({
        code: TTS_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
        message:
          "Google Cloud TTS client not initialized. Set GOOGLE_APPLICATION_CREDENTIALS or pass credentials path.",
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }
    const client = await this.getClient();

    const span = SpanSerializer.createSpan(
      SpanType.TTS,
      "tts.google.listVoices",
      {
        "tts.operation": "listVoices",
        "tts.provider": "google",
      },
    );

    try {
      // Return cached voices if available, valid, and no language filter is specified
      if (
        this.voicesCache &&
        Date.now() - this.voicesCache.timestamp <
          GoogleTTSHandler.CACHE_TTL_MS &&
        !languageCode
      ) {
        const endedSpan = SpanSerializer.endSpan(span, SpanStatus.OK);
        getMetricsAggregator().recordSpan(endedSpan);
        return this.voicesCache.voices;
      }

      // Call Google Cloud listVoices API
      const [response] = await client.listVoices(
        languageCode ? { languageCode } : {},
      );

      if (!response.voices || response.voices.length === 0) {
        logger.warn("Google Cloud TTS returned no voices");
        const endedSpan = SpanSerializer.endSpan(span, SpanStatus.OK);
        getMetricsAggregator().recordSpan(endedSpan);
        return [];
      }

      const voices: TTSVoice[] = [];

      for (const voice of response.voices ?? []) {
        // Validate required fields
        if (
          !voice.name ||
          !Array.isArray(voice.languageCodes) ||
          voice.languageCodes.length === 0
        ) {
          logger.warn("Skipping voice with missing required fields", {
            name: voice.name,
            languageCodesCount: voice.languageCodes?.length,
          });
          continue;
        }

        const voiceName = voice.name;
        const languageCodes = voice.languageCodes;
        const primaryLanguageCode = languageCodes[0];

        const voiceType = this.detectVoiceType(voiceName);

        // Map Google's ssmlGender → internal TTSGender
        const gender: TTSGender =
          voice.ssmlGender === "MALE"
            ? "male"
            : voice.ssmlGender === "FEMALE"
              ? "female"
              : "neutral";

        voices.push({
          id: voiceName,
          name: voiceName,
          languageCode: primaryLanguageCode,
          languageCodes,
          gender,
          type: voiceType,
          naturalSampleRateHertz: voice.naturalSampleRateHertz ?? undefined,
        });
      }

      // Cache the result with timestamp if no language filter
      if (!languageCode) {
        this.voicesCache = { voices, timestamp: Date.now() };
      }

      const endedSpan = SpanSerializer.endSpan(span, SpanStatus.OK);
      getMetricsAggregator().recordSpan(endedSpan);
      return voices;
    } catch (err) {
      // Record error span
      const endedSpan = SpanSerializer.endSpan(
        span,
        SpanStatus.ERROR,
        err instanceof Error ? err.message : "Unknown error",
      );
      getMetricsAggregator().recordSpan(endedSpan);
      // Log error but return empty array for graceful degradation
      const message = err instanceof Error ? err.message : "Unknown error";
      logger.error(`Failed to fetch Google TTS voices: ${message}`);
      return [];
    }
  }

  /**
   * Generate audio from text using provider-specific TTS API
   *
   * @param text - Text or SSML to convert to speech
   * @param options - TTS configuration options
   * @returns Audio buffer with metadata
   */
  async synthesize(text: string, options: TTSOptions): Promise<TTSResult> {
    if (!this.isConfigured()) {
      throw new TTSError({
        code: TTS_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
        message:
          "Google Cloud TTS client not initialized. Set GOOGLE_APPLICATION_CREDENTIALS or pass credentials path.",
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }
    const client = await this.getClient();

    const voiceId = options.voice ?? "en-US-Neural2-C";
    const span = SpanSerializer.createSpan(
      SpanType.TTS,
      "tts.google.synthesize",
      {
        "tts.operation": "synthesize",
        "tts.provider": "google",
        "tts.voice": voiceId,
        "tts.format": options.format ?? "mp3",
      },
    );
    const startTime = Date.now();

    try {
      const isSSML = text.startsWith("<speak>") && text.endsWith("</speak>");
      // Note: This validation only checks for the presence of opening and closing <speak> tags.
      // Other SSML validation, such as malformed structure, unclosed inner tags, or invalid elements,
      // will be handled by Google's API.
      if (
        (text.startsWith("<speak>") && !text.endsWith("</speak>")) ||
        (!text.startsWith("<speak>") && text.endsWith("</speak>"))
      ) {
        throw new TTSError({
          code: TTS_ERROR_CODES.INVALID_INPUT,
          message:
            "Malformed SSML: missing opening <speak> or closing </speak> tag.",
          category: ErrorCategory.VALIDATION,
          severity: ErrorSeverity.MEDIUM,
          retriable: false,
        });
      }

      const languageCode = this.extractLanguageCode(voiceId);
      const audioEncoding = this.mapFormat(options.format ?? "mp3");

      const request = {
        input: isSSML ? { ssml: text } : { text },
        voice: {
          name: voiceId,
          languageCode,
        },
        audioConfig: {
          audioEncoding,
          speakingRate: options.speed ?? 1.0,
          pitch: options.pitch ?? 0.0,
          volumeGainDb: options.volumeGainDb ?? 0.0,
        },
      };

      const [response] = await client.synthesizeSpeech(request, {
        timeout: GoogleTTSHandler.DEFAULT_API_TIMEOUT_MS,
      });

      const audioContent = response.audioContent;

      if (!audioContent) {
        throw new TTSError({
          code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
          message: "Google TTS returned empty audio content",
          category: ErrorCategory.EXECUTION,
          severity: ErrorSeverity.HIGH,
          retriable: true,
        });
      }

      const buffer =
        audioContent instanceof Uint8Array
          ? Buffer.from(audioContent)
          : typeof audioContent === "string"
            ? Buffer.from(audioContent, "base64")
            : (() => {
                throw new TTSError({
                  code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
                  message:
                    "Unsupported audioContent type returned by Google TTS",
                  category: ErrorCategory.EXECUTION,
                  severity: ErrorSeverity.HIGH,
                  retriable: true,
                  context: { type: typeof audioContent },
                });
              })();

      const latency = Date.now() - startTime;

      const endedSpan = SpanSerializer.endSpan(span, SpanStatus.OK);
      getMetricsAggregator().recordSpan(endedSpan);

      return {
        buffer,
        format: options.format ?? "mp3",
        size: buffer.length,
        voice: voiceId,
        metadata: {
          latency,
          provider: "google-ai",
        },
      };
    } catch (err) {
      const endedSpan = SpanSerializer.endSpan(
        span,
        SpanStatus.ERROR,
        err instanceof Error ? err.message : String(err),
      );
      getMetricsAggregator().recordSpan(endedSpan);

      if (err instanceof TTSError) {
        throw err;
      }

      const latency = Date.now() - startTime;
      const message = err instanceof Error ? err.message : "Unknown error";
      throw new TTSError({
        code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
        message: `Google TTS failed after ${latency}ms: ${message}`,
        category: ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable: true,
        context: { latency },
        originalError: err instanceof Error ? err : undefined,
      });
    }
  }

  /**
   * Voice names Google's streaming endpoint will synthesize.
   *
   * Streaming is not a property of the API, it is a property of the voice:
   * every other family is rejected outright with `INVALID_ARGUMENT:
   * Currently, only Chirp 3: HD voices are supported for streaming
   * synthesis`. Measured against the live API — `Chirp3-HD` (en-US, en-GB and
   * de-DE), `Chirp-HD` and `Journey` all stream; `Neural2` and `Studio` are
   * refused. The locale prefix is required so a malformed name cannot reach
   * the wire and fail a segment that the buffered path would have served.
   */
  private static readonly STREAMING_VOICE_PATTERN =
    /^[a-z]{2,3}-[A-Z]{2}-(?:Chirp3-HD|Chirp-HD|Journey)-/;

  /**
   * Sample rate requested for streamed audio, in Hz.
   *
   * Reported on every chunk so a consumer can interpret headerless `PCM`
   * bytes. Google honours the request — 16000 was measured returning
   * proportionally fewer bytes for the same text — and 24000 matches what
   * `getSampleRate()` reports for the buffered path.
   */
  private static readonly STREAMING_SAMPLE_RATE_HZ = 24000;

  /**
   * How long a stream may go without delivering a response before it is
   * treated as stalled.
   *
   * Deliberately an *idle* bound rather than a bound on the whole call, which
   * is what `DEFAULT_API_TIMEOUT_MS` gives `synthesize()`. Streaming produces
   * audio at roughly playback speed, so a total bound would fail a long but
   * perfectly healthy segment purely for being long.
   */
  private static readonly STREAMING_IDLE_TIMEOUT_MS = 30 * 1000;

  /**
   * Map a requested audio format to a streaming audio encoding, or
   * `undefined` when streaming cannot produce it.
   *
   * Only formats with direct wire proof of incremental delivery appear here.
   * `PCM` delivered 41 reads with the first at 697ms and the body complete at
   * 6131ms; `OGG_OPUS` delivered 11 reads with the first at 443ms. `MP3` and
   * `LINEAR16` — both valid for `synthesizeSpeech` — are rejected by the
   * streaming endpoint as unsupported encodings, so `mp3` and `wav` take the
   * buffered path. `mp3` being the default format is why a caller has to opt
   * in to streaming by asking for one of these two.
   */
  private static mapStreamingFormat(
    format: TTSAudioFormat,
  ): GoogleStreamingAudioEncoding | undefined {
    switch (format) {
      case "pcm16":
        return "PCM";
      case "ogg":
      case "opus":
        return "OGG_OPUS";
      default:
        return undefined;
    }
  }

  /**
   * Coerce one streaming response into its audio payload, or `undefined` when
   * it carries none.
   *
   * The generated response type says `audioContent` is `Uint8Array | string |
   * null`, and which one arrives depends on how the transport was configured
   * — so both are handled rather than trusted.
   */
  private static streamedAudio(response: unknown): Buffer | undefined {
    if (response === null || typeof response !== "object") {
      return undefined;
    }
    const audioContent = (response as { audioContent?: unknown }).audioContent;
    if (audioContent instanceof Uint8Array) {
      return audioContent.byteLength > 0
        ? Buffer.from(
            audioContent.buffer,
            audioContent.byteOffset,
            audioContent.byteLength,
          )
        : undefined;
    }
    if (typeof audioContent === "string" && audioContent.length > 0) {
      const decoded = Buffer.from(audioContent, "base64");
      return decoded.length > 0 ? decoded : undefined;
    }
    return undefined;
  }

  /**
   * Stream one pre-validated segment's audio as Google produces it.
   *
   * Returns `undefined` — the contract's "not incrementally deliverable"
   * signal — unless the voice and the format are both ones the streaming
   * endpoint was measured to accept, and the text is not SSML.
   * `StreamingSynthesisInput` has no `ssml` field at all, so markup that
   * `synthesize()` would honour has to stay on the buffered path rather than
   * be sent as literal text.
   *
   * Every non-empty response is yielded as it arrives and carries `isFinal:
   * false`. `TTSProcessor` recomputes indexes, cumulative sizes and finality
   * globally across segments and discards whatever a handler reports, so
   * labelling the last response here would buy nothing and would cost a
   * one-response lookahead.
   */
  synthesizeStream(
    text: string,
    options: TTSOptions = {},
  ): AsyncIterable<TTSChunk> | undefined {
    const voiceId = options.voice;
    if (
      voiceId === undefined ||
      !GoogleTTSHandler.STREAMING_VOICE_PATTERN.test(voiceId)
    ) {
      return undefined;
    }
    const format = options.format ?? "mp3";
    const audioEncoding = GoogleTTSHandler.mapStreamingFormat(format);
    if (audioEncoding === undefined) {
      return undefined;
    }
    if (text.trimStart().startsWith("<speak")) {
      return undefined;
    }

    const languageCode = this.extractLanguageCode(voiceId);
    const sampleRateHertz = GoogleTTSHandler.STREAMING_SAMPLE_RATE_HZ;
    const handler = this;
    // Typed off the client rather than named: Critical Rule 2 puts every type
    // ALIAS in src/lib/types/, and a gax duplex handle that exists only for
    // the cancel hook below does not belong in the public type surface.
    let active:
      | ReturnType<TextToSpeechClient["streamingSynthesize"]>
      | undefined;
    let cancelled = false;
    let idleTimedOut = false;

    const stream = (async function* (): AsyncGenerator<TTSChunk> {
      const client = await handler.getClient();
      const startedAt = Date.now();
      const duplex = client.streamingSynthesize();
      active = duplex;
      let idleTimer: ReturnType<typeof setTimeout> | undefined;
      const armIdleTimer = (): void => {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
          idleTimedOut = true;
          duplex.destroy();
        }, GoogleTTSHandler.STREAMING_IDLE_TIMEOUT_MS);
      };
      let index = 0;
      let cumulativeSize = 0;

      try {
        duplex.write({
          streamingConfig: {
            voice: { name: voiceId, languageCode },
            streamingAudioConfig: {
              audioEncoding,
              sampleRateHertz,
              speakingRate: options.speed ?? 1.0,
            },
          },
        });
        duplex.write({ input: { text } });
        duplex.end();
        armIdleTimer();

        for await (const response of duplex as AsyncIterable<unknown>) {
          armIdleTimer();
          const data = GoogleTTSHandler.streamedAudio(response);
          if (data === undefined) {
            continue;
          }
          cumulativeSize += data.length;
          yield {
            data,
            format,
            index: index++,
            isFinal: false,
            cumulativeSize,
            voice: voiceId,
            sampleRate: sampleRateHertz,
          };
        }

        logger.debug(
          `[GoogleTTSHandler] Streamed ${cumulativeSize} bytes in ${Date.now() - startedAt}ms`,
        );
      } catch (err) {
        if (cancelled) {
          // The consumer stopped and the cancel hook destroyed the stream
          // underneath an in-flight read. That is not a synthesis failure.
          return;
        }
        if (err instanceof TTSError) {
          throw err;
        }
        const message = err instanceof Error ? err.message : "Unknown error";
        throw new TTSError({
          code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
          message: idleTimedOut
            ? `Google TTS streaming synthesis stalled for ${GoogleTTSHandler.STREAMING_IDLE_TIMEOUT_MS}ms`
            : `Google TTS streaming synthesis failed: ${message}`,
          category: idleTimedOut
            ? ErrorCategory.NETWORK
            : ErrorCategory.EXECUTION,
          severity: ErrorSeverity.HIGH,
          retriable: true,
          context: { voice: voiceId, audioEncoding },
          originalError: err instanceof Error ? err : undefined,
        });
      } finally {
        clearTimeout(idleTimer);
        active = undefined;
        duplex.destroy();
      }
    })();

    return attachStreamCancel(stream, () => {
      cancelled = true;
      active?.destroy();
    });
  }

  /**
   * Extract language code from a Google Cloud voice name
   *
   * Example:
   *   "en-US-Neural2-C" -> "en-US"
   *
   * @param voiceId - Google Cloud voice identifier
   * @returns Language code compatible with Google TTS
   */
  private extractLanguageCode(voiceId: string): string {
    const parts = voiceId.split("-");
    if (parts.length >= 2) {
      return `${parts[0]}-${parts[1]}`;
    } else {
      throw new TTSError({
        code: TTS_ERROR_CODES.INVALID_INPUT,
        message: `Invalid Google TTS voiceId format: "${voiceId}". Expected format like "en-US-Neural2-C".`,
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.MEDIUM,
        retriable: false,
        context: { voiceId },
      });
    }
  }

  /**
   * Map application audio format to Google Cloud audio encoding
   *
   * @param format - Audio format requested by the caller
   * @returns Google Cloud AudioEncoding enum value
   * @throws Error if format is unsupported
   */
  private mapFormat(format: string): GoogleAudioEncoding {
    switch (format.toLowerCase()) {
      case "mp3":
        return "MP3";
      case "wav":
        return "LINEAR16";
      case "ogg":
      case "opus":
        return "OGG_OPUS";
      default:
        throw new TTSError({
          code: TTS_ERROR_CODES.INVALID_INPUT,
          message: `Unsupported audio format: ${format}`,
          category: ErrorCategory.VALIDATION,
          severity: ErrorSeverity.MEDIUM,
          retriable: false,
          context: { format },
        });
    }
  }

  /**
   * Detect the voice type from a Google Cloud TTS voice name
   *
   * Parses the voice name to identify the underlying voice technology/model type.
   * Google Cloud TTS offers different voice types with varying quality and pricing.
   *
   * @param name - The full Google Cloud voice name (e.g., "en-US-Neural2-C")
   * @returns The detected voice type
   *
   * @example
   * detectVoiceType("en-US-Neural2-C") // returns "neural"
   * detectVoiceType("en-US-Wavenet-A") // returns "wavenet"
   * detectVoiceType("en-US-Standard-B") // returns "standard"
   * detectVoiceType("en-US-Chirp-A") // returns "chirp"
   * detectVoiceType("en-US-Journey-D") // returns "unknown" (unrecognized type)
   */
  private detectVoiceType(name: string): TTSVoiceType {
    const tokens = name.toLowerCase().split("-");

    if (tokens.some((t) => t.startsWith("chirp"))) {
      return "chirp";
    }
    if (tokens.includes("neural2")) {
      return "neural";
    }
    if (tokens.includes("wavenet")) {
      return "wavenet";
    }
    if (tokens.includes("standard")) {
      return "standard";
    }

    return "unknown";
  }
}
