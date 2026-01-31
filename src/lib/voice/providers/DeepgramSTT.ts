/**
 * Deepgram Speech-to-Text Handler
 *
 * Implementation of STT using Deepgram's Speech Recognition API.
 *
 * @module voice/providers/DeepgramSTT
 */

import type { STTHandler } from "../STTProvider.js";
import type {
  STTOptions,
  STTResult,
  STTLanguage,
  TranscriptionSegment,
  AudioFormat,
  WordTiming,
} from "../types/voiceTypes.js";
import { STTError } from "../errors.js";
import { logger } from "../../utils/logger.js";

/**
 * Deepgram model options
 */
export type DeepgramModel =
  | "nova-2"
  | "nova-2-general"
  | "nova-2-meeting"
  | "nova-2-phonecall"
  | "nova-2-voicemail"
  | "nova-2-finance"
  | "nova-2-medical"
  | "nova"
  | "enhanced"
  | "base";

/**
 * Deepgram-specific STT options
 */
export type DeepgramSTTOptions = STTOptions & {
  /** Model to use */
  model?: DeepgramModel;
  /** Enable smart formatting */
  smartFormat?: boolean;
  /** Enable utterances */
  utterances?: boolean;
  /** Utterance split threshold (0.0-1.0) */
  uttSplit?: number;
  /** Enable paragraphs */
  paragraphs?: boolean;
  /** Enable filler words detection */
  fillerWords?: boolean;
  /** Custom keywords for boosting */
  keywords?: string[];
  /** Keyword boost amount */
  keywordBoost?: "legacy" | "medium" | "high";
  /** Redact sensitive content */
  redact?: ("pci" | "numbers" | "ssn")[];
  /** Custom search terms */
  search?: string[];
  /** Replacement rules */
  replace?: Record<string, string>;
  /** Callback URL for async processing */
  callback?: string;
};

/**
 * Deepgram API response types
 */
type DeepgramWord = {
  word: string;
  start: number;
  end: number;
  confidence: number;
  punctuated_word?: string;
  speaker?: number;
};

type DeepgramAlternative = {
  transcript: string;
  confidence: number;
  words: DeepgramWord[];
  paragraphs?: {
    transcript: string;
    paragraphs: Array<{
      sentences: Array<{
        text: string;
        start: number;
        end: number;
      }>;
    }>;
  };
};

type DeepgramChannel = {
  alternatives: DeepgramAlternative[];
};

type DeepgramUtterance = {
  start: number;
  end: number;
  confidence: number;
  channel: number;
  transcript: string;
  words: DeepgramWord[];
  speaker?: number;
  id: string;
};

type DeepgramResult = {
  channels: DeepgramChannel[];
  utterances?: DeepgramUtterance[];
};

type DeepgramResponse = {
  metadata: {
    transaction_key: string;
    request_id: string;
    sha256: string;
    created: string;
    duration: number;
    channels: number;
    models: string[];
  };
  results: DeepgramResult;
};

/**
 * Deepgram Speech-to-Text Handler
 *
 * Supports real-time streaming, speaker diarization, and smart formatting.
 *
 * @see https://developers.deepgram.com/docs
 */
export class DeepgramSTTHandler implements STTHandler {
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
    this.apiKey = apiKey ?? process.env.DEEPGRAM_API_KEY ?? null;
  }

  isConfigured(): boolean {
    return this.apiKey !== null;
  }

  getSupportedFormats(): AudioFormat[] {
    return ["mp3", "wav", "ogg", "opus"];
  }

  async getSupportedLanguages(): Promise<STTLanguage[]> {
    // Deepgram supports 40+ languages
    return [
      { code: "en", name: "English", supportsDiarization: true, supportsPunctuation: true },
      { code: "en-US", name: "English (US)", supportsDiarization: true, supportsPunctuation: true },
      { code: "en-GB", name: "English (UK)", supportsDiarization: true, supportsPunctuation: true },
      { code: "es", name: "Spanish", supportsDiarization: true, supportsPunctuation: true },
      { code: "fr", name: "French", supportsDiarization: true, supportsPunctuation: true },
      { code: "de", name: "German", supportsDiarization: true, supportsPunctuation: true },
      { code: "it", name: "Italian", supportsDiarization: true, supportsPunctuation: true },
      { code: "pt", name: "Portuguese", supportsDiarization: true, supportsPunctuation: true },
      { code: "nl", name: "Dutch", supportsDiarization: true, supportsPunctuation: true },
      { code: "ja", name: "Japanese", supportsDiarization: true, supportsPunctuation: true },
      { code: "ko", name: "Korean", supportsDiarization: true, supportsPunctuation: true },
      { code: "zh", name: "Chinese", supportsDiarization: true, supportsPunctuation: true },
      { code: "hi", name: "Hindi", supportsDiarization: true, supportsPunctuation: true },
      { code: "ru", name: "Russian", supportsDiarization: true, supportsPunctuation: true },
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

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Token ${this.apiKey}`,
          "Content-Type": this.getMimeType(options.format ?? "wav"),
        },
        body: audioBuffer,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
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
          speaker: utt.speaker !== undefined ? `Speaker ${utt.speaker}` : undefined,
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
      logger.error(`[DeepgramSTTHandler] Transcription failed: ${errorMessage}`);
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
    let resolveNext: ((value: IteratorResult<TranscriptionSegment>) => void) | null = null;
    let done = false;
    let error: Error | null = null;

    ws.on("message", (data: Buffer) => {
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
      } catch (parseError) {
        logger.warn(`[DeepgramSTTHandler] Failed to parse WebSocket message`);
      }
    });

    ws.on("error", (err: Error) => {
      error = err;
      if (resolveNext) {
        resolveNext({ value: undefined as unknown as TranscriptionSegment, done: true });
        resolveNext = null;
      }
    });

    ws.on("close", () => {
      done = true;
      if (resolveNext) {
        resolveNext({ value: undefined as unknown as TranscriptionSegment, done: true });
        resolveNext = null;
      }
    });

    // Wait for connection
    await new Promise<void>((resolve, reject) => {
      ws.on("open", () => resolve());
      ws.on("error", reject);
    });

    // Send audio chunks
    const sendAudio = async () => {
      try {
        for await (const chunk of audioStream) {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(chunk);
          }
        }
        // Send close message
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "CloseStream" }));
        }
      } catch (sendError) {
        logger.error(
          `[DeepgramSTTHandler] Error sending audio: ${sendError instanceof Error ? sendError.message : String(sendError)}`,
        );
      }
    };

    // Start sending audio in background
    sendAudio();

    // Yield segments
    while (!done) {
      if (error) {
        throw STTError.streamError(error.message, "deepgram");
      }

      if (messageQueue.length > 0) {
        yield messageQueue.shift()!;
      } else {
        // Wait for next message
        await new Promise<IteratorResult<TranscriptionSegment>>((resolve) => {
          resolveNext = resolve;
        });
      }
    }

    // Yield remaining messages
    while (messageQueue.length > 0) {
      yield messageQueue.shift()!;
    }

    ws.close();
  }

  /**
   * Get MIME type for audio format
   */
  private getMimeType(format: AudioFormat): string {
    const mimeTypes: Record<AudioFormat, string> = {
      mp3: "audio/mpeg",
      wav: "audio/wav",
      ogg: "audio/ogg",
      opus: "audio/opus",
    };
    return mimeTypes[format] ?? "audio/wav";
  }
}
