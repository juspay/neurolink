/**
 * Text-to-Speech (TTS) Processing Utility
 * Provides unified interface for TTS synthesis with streaming support
 */

import { logger } from "./logger.js";
import type {
  TTSHandler,
  TTSOptions,
  TTSSynthesizeResult,
  TTSChunk,
  TTSEncoding,
} from "../types/ttsTypes.js";
import { TTSError } from "../types/ttsTypes.js";

/**
 * TTS Processor for converting text to speech
 *
 * Provides both streaming and non-streaming synthesis:
 * - synthesize(): Single-shot synthesis returning complete audio buffer
 * - synthesizeStream(): Streaming synthesis for real-time audio generation
 *
 * Streaming behavior:
 * - If handler supports streaming: calls handler.synthesizeStream() directly
 * - If not supported: implements fallback buffering strategy
 * - Fallback: accumulates all text, synthesizes once, yields single chunk
 *
 * @example
 * ```typescript
 * const processor = new TTSProcessor(handler);
 *
 * // Non-streaming synthesis
 * const result = await processor.synthesize("Hello, world!", {
 *   voice: "en-US-Neural2-C",
 *   encoding: "MP3"
 * });
 *
 * // Streaming synthesis
 * for await (const chunk of processor.synthesizeStream("Hello, world!", {
 *   voice: "en-US-Neural2-C"
 * })) {
 *   console.log(`Received ${chunk.audio.length} bytes, complete: ${chunk.complete}`);
 * }
 * ```
 */
export class TTSProcessor {
  private handler: TTSHandler;

  /**
   * Create a new TTS processor
   * @param handler - TTS handler implementation
   */
  constructor(handler: TTSHandler) {
    this.handler = handler;
  }

  /**
   * Synthesize text to speech (non-streaming)
   *
   * @param text - Text to synthesize
   * @param options - TTS options
   * @returns Synthesized audio result
   * @throws {TTSError} If synthesis fails
   */
  async synthesize(
    text: string,
    options: TTSOptions,
  ): Promise<TTSSynthesizeResult> {
    try {
      // Validate input
      this.validateInput(text, options);

      logger.debug("Synthesizing text with TTS", {
        textLength: text.length,
        voice: options.voice,
        encoding: options.encoding || "MP3",
      });

      // Call handler's synthesize method
      const result = await this.handler.synthesize(text, options);

      logger.debug("TTS synthesis completed", {
        size: result.size,
        encoding: result.encoding,
        duration: result.duration,
      });

      return result;
    } catch (error) {
      logger.error("TTS synthesis failed", error);
      throw this.wrapError(error, "SYNTHESIS_FAILED");
    }
  }

  /**
   * Synthesize text to speech with streaming
   *
   * Strategy:
   * 1. Check if handler supports streaming (handler.supportsStreaming())
   * 2. If supported: call handler.synthesizeStream() directly
   * 3. If not supported: implement fallback buffering strategy
   *    - Accumulate all text chunks
   *    - Synthesize once using handler.synthesize()
   *    - Yield single TTSChunk marked as complete
   *
   * @param text - Text to synthesize
   * @param options - TTS options
   * @returns Async iterable of audio chunks
   * @throws {TTSError} If streaming fails
   */
  async *synthesizeStream(
    text: string,
    options: TTSOptions,
  ): AsyncIterable<TTSChunk> {
    try {
      // Validate input
      this.validateInput(text, options);

      logger.debug("Starting TTS streaming synthesis", {
        textLength: text.length,
        voice: options.voice,
        encoding: options.encoding || "MP3",
        handlerSupportsStreaming: this.handler.supportsStreaming(),
      });

      // Check if handler supports streaming
      if (this.handler.supportsStreaming() && this.handler.synthesizeStream) {
        // Handler supports streaming - use it directly
        logger.debug("Using handler's native streaming support");

        let chunkCount = 0;
        try {
          for await (const chunk of this.handler.synthesizeStream(
            text,
            options,
          )) {
            chunkCount++;
            logger.debug("Yielding TTS chunk", {
              sequence: chunkCount,
              size: chunk.audio.length,
              complete: chunk.complete,
            });
            yield chunk;
          }
          logger.debug("TTS streaming completed", { totalChunks: chunkCount });
        } catch (error) {
          logger.error("TTS streaming failed from handler", error);
          throw this.wrapError(error, "STREAMING_FAILED");
        }
      } else {
        // Handler doesn't support streaming - use fallback buffering strategy
        logger.debug(
          "Handler doesn't support streaming, using fallback buffering strategy",
        );

        try {
          // Accumulate all text and synthesize once
          const result = await this.handler.synthesize(text, options);

          // Yield single chunk marked as complete
          const chunk: TTSChunk = {
            audio: result.audio,
            complete: true,
            metadata: {
              size: result.size,
              duration: result.duration,
              sequence: 1,
            },
          };

          logger.debug("Yielding fallback TTS chunk", {
            size: chunk.audio.length,
            complete: chunk.complete,
          });

          yield chunk;

          logger.debug("TTS fallback synthesis completed");
        } catch (error) {
          logger.error("TTS fallback synthesis failed", error);
          throw this.wrapError(error, "SYNTHESIS_FAILED");
        }
      }
    } catch (error) {
      // Wrap and rethrow if not already a TTSError
      if (error instanceof TTSError) {
        throw error;
      }
      logger.error("TTS synthesizeStream failed", error);
      throw this.wrapError(error, "STREAMING_FAILED");
    }
  }

  /**
   * Validate TTS input parameters
   * @param text - Text to validate
   * @param options - Options to validate
   * @throws {TTSError} If validation fails
   */
  private validateInput(text: string, options: TTSOptions): void {
    // Validate text
    if (!text || text.trim().length === 0) {
      throw new TTSError(
        "Text is required and cannot be empty",
        "INVALID_TEXT",
      );
    }

    // Check text length (Google TTS limit is 5000 bytes)
    const textBytes = new TextEncoder().encode(text).length;
    if (textBytes > 5000) {
      throw new TTSError(
        `Text exceeds 5000 bytes (got ${textBytes} bytes)`,
        "TEXT_TOO_LONG",
      );
    }

    // Validate voice
    if (!options.voice || options.voice.trim().length === 0) {
      throw new TTSError("Voice is required", "INVALID_VOICE");
    }

    // Validate voice name format (e.g., "en-US-Neural2-C")
    const voicePattern = /^[a-z]{2}-[A-Z]{2}(?:-[A-Za-z0-9]+)+$/;
    if (!voicePattern.test(options.voice)) {
      throw new TTSError(
        `Invalid voice name format: ${options.voice}`,
        "INVALID_VOICE",
      );
    }

    // Validate speaking rate (0.25 to 4.0)
    if (
      options.speakingRate !== undefined &&
      (options.speakingRate < 0.25 || options.speakingRate > 4.0)
    ) {
      throw new TTSError(
        `Speaking rate must be between 0.25 and 4.0 (got ${options.speakingRate})`,
        "INVALID_RATE",
      );
    }

    // Validate pitch (-20.0 to 20.0)
    if (
      options.pitch !== undefined &&
      (options.pitch < -20.0 || options.pitch > 20.0)
    ) {
      throw new TTSError(
        `Pitch must be between -20.0 and 20.0 (got ${options.pitch})`,
        "INVALID_PITCH",
      );
    }

    // Validate encoding
    if (options.encoding) {
      const validEncodings: TTSEncoding[] = ["MP3", "WAV", "OGG"];
      if (!validEncodings.includes(options.encoding)) {
        throw new TTSError(
          `Invalid encoding: ${options.encoding}. Must be one of: ${validEncodings.join(", ")}`,
          "INVALID_ENCODING",
        );
      }
    }
  }

  /**
   * Wrap an error in a TTSError
   * @param error - Original error
   * @param errorType - TTS error type
   * @returns TTSError instance
   */
  private wrapError(
    error: unknown,
    errorType: "SYNTHESIS_FAILED" | "STREAMING_FAILED",
  ): TTSError {
    if (error instanceof TTSError) {
      return error;
    }

    const message =
      error instanceof Error ? error.message : String(error || "Unknown error");

    return new TTSError(
      `TTS ${errorType.toLowerCase()}: ${message}`,
      errorType,
      error,
    );
  }
}
