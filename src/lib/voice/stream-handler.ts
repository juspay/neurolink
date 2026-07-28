/**
 * Stream Handler for Voice Module
 *
 * Provides audio stream chunking, backpressure handling, and stream coordination.
 *
 * @module voice/stream-handler
 */

import { EventEmitter } from "events";
import { logger } from "../utils/logger.js";
import type { AudioStreamChunk, StreamHandlerConfig } from "../types/index.js";

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<StreamHandlerConfig> = {
  chunkDurationMs: 100, // 100ms chunks
  sampleRate: 16000,
  bytesPerSample: 2, // 16-bit mono
  format: "wav",
  highWaterMark: 64 * 1024, // 64KB
  bufferTimeoutMs: 5000, // 5 seconds
};

/**
 * Chunked Audio Stream Handler
 *
 * Handles audio stream chunking with backpressure management.
 *
 * @example
 * ```typescript
 * const handler = new ChunkedAudioStream({
 *   chunkDurationMs: 100,
 *   sampleRate: 16000,
 * });
 *
 * handler.on('chunk', (chunk) => {
 *   // Process audio chunk
 * });
 *
 * handler.write(audioData);
 * handler.end();
 * ```
 */
export class ChunkedAudioStream extends EventEmitter {
  private readonly config: Required<StreamHandlerConfig>;
  private readonly chunkSize: number;
  private buffer: Buffer;
  private chunkIndex: number;
  private timestampMs: number;
  private isPaused: boolean;
  private isEnded: boolean;
  private pendingData: Buffer[];
  private bufferTimeout: NodeJS.Timeout | null;

  constructor(config: StreamHandlerConfig = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };

    if (this.config.sampleRate <= 0) {
      throw new Error(
        "Invalid stream configuration: sampleRate must be positive",
      );
    }
    if (this.config.bytesPerSample <= 0) {
      throw new Error(
        "Invalid stream configuration: bytesPerSample must be positive",
      );
    }

    // Calculate chunk size based on duration
    const bytesPerMs =
      (this.config.sampleRate * this.config.bytesPerSample) / 1000;
    this.chunkSize = Math.round(this.config.chunkDurationMs * bytesPerMs);

    if (this.chunkSize <= 0) {
      throw new Error(
        "Invalid stream configuration: chunkSize must be positive (check chunkDurationMs, sampleRate, bytesPerSample)",
      );
    }

    this.buffer = Buffer.alloc(0);
    this.chunkIndex = 0;
    this.timestampMs = 0;
    this.isPaused = false;
    this.isEnded = false;
    this.pendingData = [];
    this.bufferTimeout = null;
  }

  /**
   * Write audio data to the stream
   *
   * @param data - Audio data buffer
   * @returns True if more data can be written, false if backpressure
   */
  write(data: Buffer): boolean {
    if (this.isEnded) {
      throw new Error("Cannot write to ended stream");
    }

    // Decide backpressure state BEFORE processing so the producer can rely on
    // the returned flag without depending on a follow-up `write()` to flip it.
    // Also queue the chunk into pendingData when paused — `processData()` is
    // what eventually triggers `drain` via the `resume`/`drain` path, so it
    // must run after the resume condition is met (CodeRabbit review:
    // previously, processing first could emit `drain` synchronously inside
    // `processData()` if buffer drained below high-water mid-call, and a
    // producer that waited for `drain` after seeing `false` could deadlock).
    const willOverflow =
      this.buffer.length + data.length > this.config.highWaterMark;
    if (willOverflow) {
      if (!this.isPaused) {
        this.isPaused = true;
        this.emit("pause");
      }
      this.pendingData.push(data);
      return false;
    }

    this.processData(data);
    return true;
  }

  /**
   * Process incoming data
   */
  private processData(data: Buffer): void {
    // Append to buffer
    this.buffer = Buffer.concat([this.buffer, data]);

    // Reset buffer timeout
    this.resetBufferTimeout();

    // Emit chunks while we have enough data
    while (this.buffer.length >= this.chunkSize) {
      const chunkData = this.buffer.subarray(0, this.chunkSize);
      this.buffer = this.buffer.subarray(this.chunkSize);

      const chunk: AudioStreamChunk = {
        data: chunkData,
        index: this.chunkIndex++,
        isFinal: false,
        format: this.config.format,
        sampleRate: this.config.sampleRate,
        timestampMs: this.timestampMs,
        durationMs: this.config.chunkDurationMs,
      };

      this.timestampMs += this.config.chunkDurationMs;
      this.emit("chunk", chunk);
    }

    // Process pending data if backpressure released
    if (this.isPaused && this.buffer.length < this.config.highWaterMark / 2) {
      this.isPaused = false;
      this.emit("resume");
      this.emit("drain");

      // Process pending data. `shift()` returns `undefined` only when the
      // array is empty, which the loop guard already rules out — but check
      // explicitly so we don't carry a non-null assertion (Issue 9).
      while (this.pendingData.length > 0 && !this.isPaused) {
        const pending = this.pendingData.shift();
        if (pending === undefined) {
          break;
        }
        if (!this.write(pending)) {
          break;
        }
      }
    }
  }

  /**
   * End the stream
   */
  end(): void {
    if (this.isEnded) {
      return;
    }

    this.isEnded = true;
    this.clearBufferTimeout();

    // Drain any pending data that was buffered during backpressure
    for (const pending of this.pendingData) {
      this.buffer = Buffer.concat([this.buffer, pending]);
    }
    this.pendingData = [];

    // Emit final chunk with remaining data
    if (this.buffer.length > 0) {
      const durationMs =
        (this.buffer.length /
          this.config.bytesPerSample /
          this.config.sampleRate) *
        1000;

      const chunk: AudioStreamChunk = {
        data: this.buffer,
        index: this.chunkIndex++,
        isFinal: true,
        format: this.config.format,
        sampleRate: this.config.sampleRate,
        timestampMs: this.timestampMs,
        durationMs,
      };

      this.emit("chunk", chunk);
    } else {
      // Emit empty final chunk to signal end
      const chunk: AudioStreamChunk = {
        data: Buffer.alloc(0),
        index: this.chunkIndex,
        isFinal: true,
        format: this.config.format,
        sampleRate: this.config.sampleRate,
        timestampMs: this.timestampMs,
        durationMs: 0,
      };

      this.emit("chunk", chunk);
    }

    this.emit("end");
    this.cleanup();
  }

  /**
   * Reset buffer timeout
   */
  private resetBufferTimeout(): void {
    this.clearBufferTimeout();

    this.bufferTimeout = setTimeout(() => {
      if (this.buffer.length > 0 && !this.isEnded) {
        logger.warn(
          `[ChunkedAudioStream] Buffer timeout, forcing flush of ${this.buffer.length} bytes`,
        );
        this.end();
      }
    }, this.config.bufferTimeoutMs);
  }

  /**
   * Clear buffer timeout
   */
  private clearBufferTimeout(): void {
    if (this.bufferTimeout) {
      clearTimeout(this.bufferTimeout);
      this.bufferTimeout = null;
    }
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    this.clearBufferTimeout();
    this.buffer = Buffer.alloc(0);
    this.pendingData = [];
  }

  /**
   * Get stream statistics
   */
  getStats(): {
    chunksEmitted: number;
    bufferedBytes: number;
    pendingChunks: number;
    totalDurationMs: number;
    isPaused: boolean;
    isEnded: boolean;
  } {
    return {
      chunksEmitted: this.chunkIndex,
      bufferedBytes: this.buffer.length,
      pendingChunks: this.pendingData.length,
      totalDurationMs: this.timestampMs,
      isPaused: this.isPaused,
      isEnded: this.isEnded,
    };
  }
}

/**
 * Stream merger for combining multiple audio streams
 */
export class StreamMerger extends EventEmitter {
  private readonly streams: Map<string, ChunkedAudioStream>;
  private readonly config: Required<StreamHandlerConfig>;

  constructor(config: StreamHandlerConfig = {}) {
    super();
    this.streams = new Map();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Add a stream to merge
   *
   * @param id - Stream identifier
   * @returns The created stream
   */
  addStream(id: string): ChunkedAudioStream {
    if (this.streams.has(id)) {
      throw new Error(`Stream ${id} already exists`);
    }

    const stream = new ChunkedAudioStream(this.config);

    stream.on("chunk", (chunk) => {
      this.emit("chunk", { id, chunk });
    });

    stream.on("end", () => {
      this.emit("streamEnd", id);
      this.streams.delete(id);

      if (this.streams.size === 0) {
        this.emit("end");
      }
    });

    stream.on("error", (error) => {
      this.emit("error", { id, error });
    });

    this.streams.set(id, stream);
    return stream;
  }

  /**
   * Remove a stream
   *
   * @param id - Stream identifier
   */
  removeStream(id: string): void {
    const stream = this.streams.get(id);
    if (stream) {
      stream.end();
      this.streams.delete(id);
    }
  }

  /**
   * Write to a specific stream
   *
   * @param id - Stream identifier
   * @param data - Audio data
   */
  write(id: string, data: Buffer): boolean {
    const stream = this.streams.get(id);
    if (!stream) {
      throw new Error(`Stream ${id} not found`);
    }
    return stream.write(data);
  }

  /**
   * End all streams
   */
  endAll(): void {
    for (const stream of this.streams.values()) {
      stream.end();
    }
  }

  /**
   * Get number of active streams
   */
  get activeStreams(): number {
    return this.streams.size;
  }
}

/**
 * Stream splitter for distributing audio to multiple consumers
 */
export class StreamSplitter extends EventEmitter {
  private readonly consumers: Map<string, (chunk: AudioStreamChunk) => void>;
  private readonly input: ChunkedAudioStream;

  constructor(config: StreamHandlerConfig = {}) {
    super();
    this.consumers = new Map();
    this.input = new ChunkedAudioStream(config);

    this.input.on("chunk", (chunk) => {
      for (const [id, consumer] of this.consumers) {
        try {
          consumer(chunk);
        } catch (err) {
          this.emit("error", {
            consumerId: id,
            error: err instanceof Error ? err : new Error(String(err)),
          });
        }
      }
    });

    this.input.on("end", () => {
      this.emit("end");
    });

    this.input.on("error", (error) => {
      this.emit("error", { error });
    });
  }

  /**
   * Write audio data
   *
   * @param data - Audio data buffer
   */
  write(data: Buffer): boolean {
    return this.input.write(data);
  }

  /**
   * End the stream
   */
  end(): void {
    this.input.end();
  }

  /**
   * Add a consumer
   *
   * @param id - Consumer identifier
   * @param handler - Chunk handler function
   */
  addConsumer(id: string, handler: (chunk: AudioStreamChunk) => void): void {
    if (this.consumers.has(id)) {
      throw new Error(`Consumer ${id} already exists`);
    }
    this.consumers.set(id, handler);
  }

  /**
   * Remove a consumer
   *
   * @param id - Consumer identifier
   */
  removeConsumer(id: string): void {
    this.consumers.delete(id);
  }

  /**
   * Get number of consumers
   */
  get consumerCount(): number {
    return this.consumers.size;
  }
}

/**
 * Create an async iterable from a chunked audio stream
 *
 * @param stream - Chunked audio stream
 * @returns Async iterable of audio chunks
 */
export function streamToAsyncIterable(
  stream: ChunkedAudioStream,
): AsyncIterable<AudioStreamChunk> {
  return {
    [Symbol.asyncIterator](): AsyncIterator<AudioStreamChunk> {
      const queue: AudioStreamChunk[] = [];
      let resolveNext:
        | ((result: IteratorResult<AudioStreamChunk>) => void)
        | null = null;
      let rejectNext: ((reason: Error) => void) | null = null;
      let done = false;
      let error: Error | null = null;

      const onChunk = (chunk: AudioStreamChunk) => {
        if (resolveNext) {
          resolveNext({ value: chunk, done: false });
          resolveNext = null;
          rejectNext = null;
        } else {
          queue.push(chunk);
        }
      };

      const onEnd = () => {
        done = true;
        if (resolveNext) {
          resolveNext({
            value: undefined,
            done: true,
          });
          resolveNext = null;
          rejectNext = null;
        }
      };

      const onError = (err: Error) => {
        // NEW5: surface stream errors to the consumer instead of resolving
        // with `done: true` (which silently terminated the for-await loop
        // and lost the error entirely). When a `next()` is pending, reject
        // it. When no `next()` is pending, store the error so the next call
        // throws it.
        error = err;
        if (rejectNext) {
          rejectNext(err);
          resolveNext = null;
          rejectNext = null;
        }
      };

      stream.on("chunk", onChunk);
      stream.on("end", onEnd);
      stream.on("error", onError);

      // M8: track listener removal so the iterator's `return()` can detach
      // them when the consumer breaks early; otherwise the three listeners
      // hang on the EventEmitter for the stream's lifetime, leaking closures.
      const cleanup = () => {
        stream.off("chunk", onChunk);
        stream.off("end", onEnd);
        stream.off("error", onError);
      };

      return {
        async next(): Promise<IteratorResult<AudioStreamChunk>> {
          if (error) {
            throw error;
          }

          if (queue.length > 0) {
            // The length-guard above proves `shift()` returns a value, but
            // narrow explicitly to avoid the non-null assertion (Issue 9).
            const next = queue.shift();
            if (next !== undefined) {
              return { value: next, done: false };
            }
          }

          if (done) {
            return {
              value: undefined,
              done: true,
            };
          }

          return new Promise<IteratorResult<AudioStreamChunk>>(
            (resolve, reject) => {
              resolveNext = resolve;
              rejectNext = reject;
            },
          );
        },
        async return(): Promise<IteratorResult<AudioStreamChunk>> {
          // M8: called when the consumer breaks out of `for await` early —
          // detach listeners to prevent leak.
          cleanup();
          done = true;
          return {
            value: undefined,
            done: true,
          };
        },
      };
    },
  };
}

/**
 * Create a chunked audio stream from an async iterable
 *
 * @param iterable - Async iterable of audio buffers
 * @param config - Stream configuration
 * @returns Chunked audio stream
 */
export async function asyncIterableToStream(
  iterable: AsyncIterable<Buffer>,
  config: StreamHandlerConfig = {},
): Promise<ChunkedAudioStream> {
  const stream = new ChunkedAudioStream(config);

  // Process iterable in background.
  // Honour backpressure — `write()` returns false on overflow and pushes the
  // chunk into pendingData. Without awaiting 'drain' here, a slow consumer
  // would let pendingData grow unbounded for a long/live iterable.
  (async () => {
    try {
      for await (const data of iterable) {
        const ok = stream.write(data);
        if (!ok) {
          await new Promise<void>((resolve) => stream.once("drain", resolve));
        }
      }
      stream.end();
    } catch (err) {
      stream.emit("error", err instanceof Error ? err : new Error(String(err)));
    }
  })();

  return stream;
}

// Export main class with alias
export { ChunkedAudioStream as StreamHandler };
