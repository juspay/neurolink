import type {
  TTSChunk,
  TTSMetadata,
  TTSOptions,
  TTSResult,
} from "../types/index.js";
import { NeuroLinkError } from "./errorHandling.js";
import { sanitizeErrorCause } from "./logSanitize.js";
import { logger } from "./logger.js";
import {
  IncrementalTTSSynthesisError,
  TTS_ERROR_CODES,
  TTSProcessor,
} from "./ttsProcessor.js";
import { TimeoutError as AsyncTimeoutError } from "./async/withTimeout.js";
import { cancelStream } from "./streamCancellation.js";

function getStreamingTTSErrorDetails(
  error: unknown,
): NonNullable<TTSMetadata["error"]> {
  const incrementalFailure =
    error instanceof IncrementalTTSSynthesisError ? error : undefined;
  const cause = incrementalFailure?.firstError ?? error;
  const safeMessage = sanitizeErrorCause(cause).message;
  let detail: NonNullable<TTSMetadata["error"]>;

  if (cause instanceof AsyncTimeoutError) {
    detail = {
      code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
      message: safeMessage,
      retriable: true,
    };
  } else if (cause instanceof NeuroLinkError) {
    detail = {
      code: cause.code,
      message: safeMessage,
      retriable: cause.retriable,
    };
  } else {
    detail = {
      code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
      message: safeMessage,
    };
  }

  const failedSegments = incrementalFailure?.failedSegments;
  const count = failedSegments?.length ?? 1;
  const positions = failedSegments?.join(", ") ?? "unknown";
  return {
    ...detail,
    message: `Incremental TTS failed for ${count} segment${count === 1 ? "" : "s"} (segment${count === 1 ? "" : "s"} ${positions}): ${detail.message}`,
  };
}

class AsyncTextQueue implements AsyncIterableIterator<string> {
  private readonly values: string[] = [];
  private readonly waiters: Array<{
    resolve: (result: IteratorResult<string>) => void;
    reject: (error: unknown) => void;
  }> = [];
  private ended = false;
  private failure: unknown;

  [Symbol.asyncIterator](): AsyncIterableIterator<string> {
    return this;
  }

  next(): Promise<IteratorResult<string>> {
    if (this.values.length > 0) {
      const value = this.values.shift();
      if (value !== undefined) {
        return Promise.resolve({ value, done: false });
      }
    }
    if (this.failure !== undefined) {
      return Promise.reject(this.failure);
    }
    if (this.ended) {
      return Promise.resolve({ value: undefined, done: true });
    }
    return new Promise((resolve, reject) => {
      this.waiters.push({ resolve, reject });
    });
  }

  push(value: string): void {
    if (this.ended || this.failure !== undefined) {
      return;
    }
    const waiter = this.waiters.shift();
    if (waiter) {
      waiter.resolve({ value, done: false });
      return;
    }
    this.values.push(value);
  }

  end(): void {
    if (this.ended || this.failure !== undefined) {
      return;
    }
    this.ended = true;
    for (const waiter of this.waiters.splice(0)) {
      waiter.resolve({ value: undefined, done: true });
    }
  }

  fail(error: unknown): void {
    if (this.ended || this.failure !== undefined) {
      return;
    }
    this.failure = error;
    for (const waiter of this.waiters.splice(0)) {
      waiter.reject(error);
    }
  }
}

function sourceEvent<T>(iterator: AsyncIterator<T>) {
  return iterator.next().then(
    (result) => ({ kind: "source" as const, result }),
    (error: unknown) => ({ kind: "source-error" as const, error }),
  );
}

function audioEvent(iterator: AsyncIterator<TTSChunk>) {
  return iterator.next().then(
    (result) => ({ kind: "audio" as const, result }),
    (error: unknown) => ({ kind: "audio-error" as const, error }),
  );
}

function textFromChunk(chunk: unknown): string | undefined {
  if (
    chunk &&
    typeof chunk === "object" &&
    "content" in chunk &&
    typeof chunk.content === "string" &&
    chunk.content.length > 0
  ) {
    return chunk.content;
  }
  return undefined;
}

function aggregateTTSChunks(chunks: TTSChunk[]): TTSResult | undefined {
  const last = chunks.at(-1);
  if (!last) {
    return undefined;
  }
  const buffer = Buffer.concat(chunks.map((chunk) => chunk.data));
  return {
    buffer,
    format: last.format,
    size: buffer.length,
    duration: last.estimatedDuration,
    voice: last.voice,
    sampleRate: last.sampleRate,
  };
}

/**
 * Upper bound on how long stream teardown may wait for upstream iterators to
 * acknowledge `.return()`. Closing an iterator is bookkeeping, not work, so a
 * responsive upstream finishes far inside this; an unresponsive one is exactly
 * the case that must not block the consumer. The timer is unref'd so a pending
 * grace period never by itself keeps the process alive.
 */
const RELEASE_GRACE_MS = 5_000;

function releaseGraceTimer(): Promise<void> {
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, RELEASE_GRACE_MS);
    timer.unref?.();
  });
}

/**
 * Preserve source-stream backpressure while interleaving incremental TTS audio.
 * Source chunks are yielded before their derived audio, and TTS failures degrade
 * to the unchanged source stream.
 */
export async function* interleaveTTSStream<T>(params: {
  stream: AsyncIterable<T>;
  provider: string;
  options: TTSOptions;
  onComplete?: (
    result: TTSResult | undefined,
    error?: NonNullable<TTSMetadata["error"]>,
  ) => void;
}): AsyncGenerator<T | { type: "tts_audio"; audio: TTSChunk }> {
  const { stream, provider, options, onComplete } = params;

  if (!TTSProcessor.supports(provider)) {
    try {
      for await (const chunk of stream) {
        yield chunk;
      }
    } finally {
      onComplete?.(undefined);
    }
    return;
  }

  const textQueue = new AsyncTextQueue();
  const sourceIterator = stream[Symbol.asyncIterator]();
  let cancelled = false;
  const audioIterator = TTSProcessor.synthesizeStream(
    textQueue,
    provider,
    options,
    () => cancelled,
  )[Symbol.asyncIterator]();
  const audioChunks: TTSChunk[] = [];
  let nextSource: ReturnType<typeof sourceEvent<T>> | undefined =
    sourceEvent(sourceIterator);
  let nextAudio: ReturnType<typeof audioEvent> | undefined =
    audioEvent(audioIterator);
  let completed = false;
  let preferAudio = false;

  try {
    while (nextSource || nextAudio) {
      const event =
        nextSource && nextAudio
          ? await Promise.race(
              preferAudio ? [nextAudio, nextSource] : [nextSource, nextAudio],
            )
          : nextSource
            ? await nextSource
            : nextAudio
              ? await nextAudio
              : undefined;
      if (!event) {
        break;
      }

      if (event.kind === "source-error") {
        textQueue.fail(event.error);
        throw event.error;
      }
      if (event.kind === "audio-error") {
        textQueue.end();
        const error = getStreamingTTSErrorDetails(event.error);
        logger.warn(
          `[TTSProcessor] Incremental stream disabled after an audio error: ${
            event.error instanceof Error
              ? event.error.message
              : String(event.error)
          }`,
        );
        nextAudio = undefined;
        preferAudio = false;
        completed = true;
        onComplete?.(aggregateTTSChunks(audioChunks), error);
        continue;
      }
      if (event.kind === "source") {
        if (event.result.done) {
          nextSource = undefined;
          textQueue.end();
          preferAudio = true;
          continue;
        }
        const text = textFromChunk(event.result.value);
        if (text) {
          textQueue.push(text);
        }
        nextSource = sourceEvent(sourceIterator);
        preferAudio = true;
        yield event.result.value;
        continue;
      }

      if (event.result.done) {
        nextAudio = undefined;
        completed = true;
        onComplete?.(aggregateTTSChunks(audioChunks));
        continue;
      }
      audioChunks.push(event.result.value);
      nextAudio = audioEvent(audioIterator);
      preferAudio = false;
      yield { type: "tts_audio", audio: event.result.value };
    }
  } finally {
    if (!completed) {
      cancelled = true;
      // Tell the upstream chain out of band, before asking politely via
      // `.return()` below. When the consumer breaks mid-pull every wrapper
      // beneath is parked inside an `await` and cannot process a queued
      // `return()`, so this side channel is the only thing that actually
      // reaches — and closes — the provider stream at the bottom.
      cancelStream(stream);
      // The audio side has its own wrapper chain. Native TTS can be parked in a
      // response-body read even after text ingestion stops, so its cancel hook
      // must be reached directly rather than waiting for queued `.return()`.
      cancelStream(audioIterator);
    }
    textQueue.end();
    const releases: Promise<unknown>[] = [];
    if (nextSource && sourceIterator.return) {
      releases.push(
        Promise.resolve().then(() => sourceIterator.return?.(undefined)),
      );
    }
    if (nextAudio && audioIterator.return) {
      releases.push(
        Promise.resolve().then(() => audioIterator.return?.(undefined)),
      );
    }
    // Cleanup must not be able to outlive the consumer that abandoned this
    // stream. `.return()` on an async generator parked inside an `await` is
    // queued behind the in-flight `next()` and cannot interrupt it, so when an
    // upstream pull never settles these promises settle *never* — not late.
    // Awaiting them unbounded turned a consumer's `break` into a permanent
    // hang: the caller's `for await` never returned, with no error and no way
    // to defend against it from outside this module.
    //
    // The releases are still issued, and still propagate normally whenever the
    // upstream is responsive — which is every case where awaiting them was
    // doing anything useful. We only stop making the consumer's exit depend on
    // an upstream that may never answer.
    await Promise.race([Promise.allSettled(releases), releaseGraceTimer()]);
    if (!completed) {
      onComplete?.(undefined);
    }
  }
}
