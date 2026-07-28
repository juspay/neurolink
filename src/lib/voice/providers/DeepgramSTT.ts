/**
 * Deepgram Speech-to-Text Handler
 *
 * Implementation of STT using Deepgram's Speech Recognition API.
 *
 * @module voice/providers/DeepgramSTT
 */

import { logger } from "../../utils/logger.js";
import { STTError } from "../errors.js";
import type {
  TTSAudioFormat,
  DeepgramResponse,
  DeepgramSTTOptions,
  STTHandler,
  STTLanguage,
  STTOptions,
  STTResult,
  TranscriptionSegment,
  WordTiming,
} from "../../types/index.js";

/**
 * Deepgram Speech-to-Text Handler
 *
 * Supports real-time streaming, speaker diarization, and smart formatting.
 *
 * @see https://developers.deepgram.com/docs
 */
export class DeepgramSTT implements STTHandler {
  private readonly apiKey: string | null;
  private readonly baseUrl = "https://api.deepgram.com/v1";

  /**
   * Maximum audio duration in seconds (2 hours)
   */
  public readonly maxAudioDuration = 7200;

  /**
   * Deepgram supports streaming
   */
  public readonly supportsStreaming = true;

  constructor(apiKey?: string) {
    // Normalize: trim surrounding whitespace and treat empty string as null
    // so isConfigured() and transcribe()/transcribeStream() agree on the
    // contract (other voice providers all do this — Deepgram was missed).
    const resolvedKey = (apiKey ?? process.env.DEEPGRAM_API_KEY ?? "").trim();
    this.apiKey = resolvedKey.length > 0 ? resolvedKey : null;
  }

  isConfigured(): boolean {
    return this.apiKey !== null;
  }

  getSupportedFormats(): TTSAudioFormat[] {
    return ["mp3", "wav", "ogg", "opus"];
  }

  async getSupportedLanguages(): Promise<STTLanguage[]> {
    // Deepgram supports 40+ languages
    return [
      {
        code: "en",
        name: "English",
        supportsDiarization: true,
        supportsPunctuation: true,
      },
      {
        code: "en-US",
        name: "English (US)",
        supportsDiarization: true,
        supportsPunctuation: true,
      },
      {
        code: "en-GB",
        name: "English (UK)",
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
        code: "nl",
        name: "Dutch",
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
        code: "hi",
        name: "Hindi",
        supportsDiarization: true,
        supportsPunctuation: true,
      },
      {
        code: "ru",
        name: "Russian",
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
      throw STTError.providerNotConfigured("deepgram");
    }

    const audioBuffer = Buffer.isBuffer(audio) ? audio : Buffer.from(audio);

    if (audioBuffer.length === 0) {
      throw STTError.audioEmpty("deepgram");
    }

    const deepgramOptions = options as DeepgramSTTOptions;
    const startTime = Date.now();

    try {
      // Build query parameters
      const params = new URLSearchParams();

      // Add model
      params.set("model", deepgramOptions.model ?? "nova-2");

      // Add language
      if (options.language) {
        params.set("language", options.language);
      }

      // Add punctuation
      if (options.punctuation !== false) {
        params.set("punctuate", "true");
      }

      // Add diarization
      if (options.speakerDiarization) {
        params.set("diarize", "true");
        if (options.speakerCount) {
          params.set("diarize_version", "latest");
        }
      }

      // Add smart format
      if (deepgramOptions.smartFormat) {
        params.set("smart_format", "true");
      }

      // Add utterances
      if (deepgramOptions.utterances) {
        params.set("utterances", "true");
        if (deepgramOptions.uttSplit !== undefined) {
          params.set("utt_split", deepgramOptions.uttSplit.toString());
        }
      }

      // Add paragraphs
      if (deepgramOptions.paragraphs) {
        params.set("paragraphs", "true");
      }

      // Add filler words
      if (deepgramOptions.fillerWords) {
        params.set("filler_words", "true");
      }

      // Add keywords
      if (deepgramOptions.keywords && deepgramOptions.keywords.length > 0) {
        for (const keyword of deepgramOptions.keywords) {
          params.append("keywords", keyword);
        }
        if (deepgramOptions.keywordBoost) {
          params.set("keyword_boost", deepgramOptions.keywordBoost);
        }
      }

      // Add redaction
      if (deepgramOptions.redact && deepgramOptions.redact.length > 0) {
        for (const redactType of deepgramOptions.redact) {
          params.append("redact", redactType);
        }
      }

      // Add profanity filter
      if (options.profanityFilter) {
        params.set("profanity_filter", "true");
      }

      const url = `${this.baseUrl}/listen?${params.toString()}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      let response: Response;
      try {
        response = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Token ${this.apiKey}`,
            "Content-Type": this.getMimeType(options.format ?? "wav"),
          },
          body: new Uint8Array(audioBuffer),
          signal: controller.signal,
        });
      } catch (fetchErr: unknown) {
        if (fetchErr instanceof Error && fetchErr.name === "AbortError") {
          throw STTError.transcriptionFailed(
            "Deepgram STT request timed out after 30 seconds",
            "deepgram",
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
          (errorData as { err_msg?: string }).err_msg ||
          `HTTP ${response.status}`;
        throw STTError.transcriptionFailed(errorMessage, "deepgram");
      }

      const data = (await response.json()) as DeepgramResponse;
      const latency = Date.now() - startTime;

      // Handle empty results
      if (
        !data.results?.channels ||
        data.results.channels.length === 0 ||
        !data.results.channels[0].alternatives ||
        data.results.channels[0].alternatives.length === 0
      ) {
        return {
          text: "",
          confidence: 0,
          language: options.language,
          duration: data.metadata?.duration,
          metadata: {
            latency,
            provider: "deepgram",
            requestId: data.metadata?.request_id,
          },
        };
      }

      const firstChannel = data.results.channels[0];
      const firstAlternative = firstChannel.alternatives[0];

      // Build result
      const result: STTResult = {
        text: firstAlternative.transcript,
        confidence: firstAlternative.confidence,
        language: options.language,
        duration: data.metadata?.duration,
        metadata: {
          latency,
          provider: "deepgram",
          model: deepgramOptions.model ?? "nova-2",
          requestId: data.metadata?.request_id,
        },
      };

      // Add word timings
      if (firstAlternative.words && firstAlternative.words.length > 0) {
        const speakers = new Set<string>();

        result.words = firstAlternative.words.map((word) => {
          const wordTiming: WordTiming = {
            word: word.punctuated_word ?? word.word,
            startTime: word.start,
            endTime: word.end,
            confidence: word.confidence,
          };

          if (word.speaker !== undefined) {
            wordTiming.speaker = `Speaker ${word.speaker}`;
            speakers.add(wordTiming.speaker);
          }

          return wordTiming;
        });

        if (speakers.size > 0) {
          result.speakers = Array.from(speakers);
        }
      }

      // Add utterances as segments
      if (data.results.utterances && data.results.utterances.length > 0) {
        result.segments = data.results.utterances.map((utt, index) => ({
          index,
          text: utt.transcript,
          isFinal: true,
          confidence: utt.confidence,
          startTime: utt.start,
          endTime: utt.end,
          speaker:
            utt.speaker !== undefined ? `Speaker ${utt.speaker}` : undefined,
        }));
      }

      logger.info(
        `[DeepgramSTTHandler] Transcribed ${data.metadata?.duration?.toFixed(1) ?? "?"}s audio in ${latency}ms`,
      );

      return result;
    } catch (err: unknown) {
      if (err instanceof STTError) {
        throw err;
      }

      const errorMessage =
        err instanceof Error ? err.message : String(err || "Unknown error");
      logger.error(
        `[DeepgramSTTHandler] Transcription failed: ${errorMessage}`,
      );
      throw STTError.transcriptionFailed(
        errorMessage,
        "deepgram",
        err instanceof Error ? err : undefined,
      );
    }
  }

  /**
   * Streaming transcription using WebSocket
   */
  async *transcribeStream(
    audioStream: AsyncIterable<Buffer>,
    options: STTOptions,
  ): AsyncIterable<TranscriptionSegment> {
    if (!this.apiKey) {
      throw STTError.providerNotConfigured("deepgram");
    }

    const deepgramOptions = options as DeepgramSTTOptions;

    // Build query parameters
    const params = new URLSearchParams();
    params.set("model", deepgramOptions.model ?? "nova-2");

    if (options.language) {
      params.set("language", options.language);
    }
    if (options.punctuation !== false) {
      params.set("punctuate", "true");
    }
    if (options.speakerDiarization) {
      params.set("diarize", "true");
    }
    if (deepgramOptions.smartFormat) {
      params.set("smart_format", "true");
    }

    // Indicate interim results
    params.set("interim_results", "true");

    const wsUrl = `wss://api.deepgram.com/v1/listen?${params.toString()}`;

    // Create WebSocket connection
    const WebSocket = (await import("ws")).default;
    const ws = new WebSocket(wsUrl, {
      headers: {
        Authorization: `Token ${this.apiKey}`,
      },
    });

    let segmentIndex = 0;
    const messageQueue: TranscriptionSegment[] = [];
    let resolveNext:
      | ((value: IteratorResult<TranscriptionSegment>) => void)
      | null = null;
    let done = false;
    let error: Error | null = null;

    // Bug 4 fix: name the three permanent handlers so timeout cleanup can call
    // ws.off(event, ref) per pair instead of removeAllListeners(event). The
    // surgical .off() pattern survives any future code that attaches more
    // listeners between this block and the connection-timeout firing.
    const onMessage = (data: Buffer) => {
      try {
        const response = JSON.parse(data.toString()) as {
          type: string;
          channel?: {
            alternatives?: Array<{
              transcript?: string;
              confidence?: number;
            }>;
          };
          is_final?: boolean;
          speech_final?: boolean;
        };

        if (response.type === "Results" && response.channel?.alternatives) {
          const alt = response.channel.alternatives[0];
          if (alt && alt.transcript) {
            const segment: TranscriptionSegment = {
              index: segmentIndex++,
              text: alt.transcript,
              isFinal: response.is_final ?? false,
              confidence: alt.confidence ?? 0,
            };

            if (resolveNext) {
              resolveNext({ value: segment, done: false });
              resolveNext = null;
            } else {
              messageQueue.push(segment);
            }
          }
        }
      } catch {
        logger.warn(`[DeepgramSTTHandler] Failed to parse WebSocket message`);
      }
    };
    const onError = (err: Error) => {
      error = err;
      if (resolveNext) {
        resolveNext({
          value: undefined,
          done: true,
        });
        resolveNext = null;
      }
    };
    const onClose = () => {
      done = true;
      if (resolveNext) {
        resolveNext({
          value: undefined,
          done: true,
        });
        resolveNext = null;
      }
    };
    ws.on("message", onMessage);
    ws.on("error", onError);
    ws.on("close", onClose);

    // Wait for connection (10-second timeout to avoid hanging indefinitely)
    await new Promise<void>((resolve, reject) => {
      const openHandler = () => {
        clearTimeout(connectionTimeout);
        ws.off("error", openErrorHandler);
        resolve();
      };
      const openErrorHandler = (err: Error) => {
        clearTimeout(connectionTimeout);
        ws.off("open", openHandler);
        reject(err);
      };
      const connectionTimeout = setTimeout(() => {
        // Bug 4 fix: surgical .off() per (event, handlerRef) so any future
        // listener attached to this socket survives the timeout cleanup.
        ws.off("message", onMessage);
        ws.off("error", onError);
        ws.off("close", onClose);
        ws.off("open", openHandler);
        ws.off("error", openErrorHandler);
        ws.terminate();
        reject(
          STTError.streamError(
            "WebSocket connection to Deepgram timed out after 10 seconds",
            "deepgram",
          ),
        );
      }, 10000);

      ws.on("open", openHandler);
      ws.on("error", openErrorHandler);
    });

    // Send audio chunks
    const sendAudio = async () => {
      try {
        for await (const chunk of audioStream) {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(chunk);
          }
        }
      } catch (sendError) {
        logger.error(
          `[DeepgramSTTHandler] Error sending audio: ${sendError instanceof Error ? sendError.message : String(sendError)}`,
        );
        // Surface the error so the generator loop can exit instead of hanging.
        error = sendError as Error;
        if (resolveNext) {
          resolveNext({
            value: undefined,
            done: true,
          });
          resolveNext = null;
        }
      } finally {
        // Always send CloseStream so Deepgram closes the WS even on send error;
        // otherwise `done` is never set and the generator hangs.
        if (ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(JSON.stringify({ type: "CloseStream" }));
          } catch {
            /* WS already broken */
          }
        }
      }
    };

    // Start sending audio in background — explicitly fire-and-forget with .catch
    // to surface unhandled rejections instead of crashing the process.
    void sendAudio().catch((err) => {
      logger.error(
        `[DeepgramSTTHandler] sendAudio rejected: ${err instanceof Error ? err.message : String(err)}`,
      );
    });

    // Track teardown so the audio-pump generator can stop pulling from
    // `audioStream` after the consumer breaks out of the for-await loop or
    // the WS errors. Without this, an infinite/live producer keeps running
    // and leaks the upstream resource (CodeRabbit review).
    const stopProducerEarly = () => {
      const ret = (audioStream as { return?: () => Promise<unknown> | unknown })
        .return;
      if (typeof ret === "function") {
        try {
          void Promise.resolve(ret.call(audioStream)).catch(() => undefined);
        } catch {
          // Best-effort — ignore if the iterator's return() throws.
        }
      }
    };

    // Yield segments — wrapped in try/finally so the WebSocket is always
    // closed and a CloseStream message sent, even when the consumer breaks
    // out of the for-await loop early (C2: previously the WS would leak and
    // sendAudio would keep running in the background).
    try {
      while (!done) {
        if (error) {
          throw STTError.streamError((error as Error).message, "deepgram");
        }

        if (messageQueue.length > 0) {
          // Issue 9: explicit narrowing — `length > 0` proves shift returns a
          // value, but TypeScript can't tie the two; narrow without `!`.
          const next = messageQueue.shift();
          if (next !== undefined) {
            yield next;
          }
        } else {
          // Wait for next message — capture and yield the resolved segment
          const result = await new Promise<
            IteratorResult<TranscriptionSegment>
          >((resolve) => {
            resolveNext = resolve;
          });
          if (!result.done && result.value) {
            yield result.value;
          }
        }
      }

      // Yield remaining messages
      while (messageQueue.length > 0) {
        const next = messageQueue.shift();
        if (next !== undefined) {
          yield next;
        }
      }
    } finally {
      // Tell the upstream producer (the caller's audioStream iterator) to
      // stop — sendAudio() is the only consumer of that iterator, so once
      // we're tearing down it should not be pulling more chunks.
      stopProducerEarly();
      // C2: always close the socket — sends Deepgram's CloseStream sentinel
      // when reachable, then terminates if still open after a short window.
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify({ type: "CloseStream" }));
        } catch {
          // Ignore — socket may have been closed by the server
        }
        ws.close();
      } else if (
        ws.readyState === WebSocket.CONNECTING ||
        ws.readyState === WebSocket.CLOSING
      ) {
        ws.terminate();
      }
    }
  }

  /**
   * Get MIME type for audio format
   */
  private getMimeType(format: TTSAudioFormat): string {
    const mimeTypes: Partial<Record<TTSAudioFormat, string>> = {
      mp3: "audio/mpeg",
      wav: "audio/wav",
      ogg: "audio/ogg",
      opus: "audio/opus",
    };
    return mimeTypes[format] ?? "audio/wav";
  }
}
