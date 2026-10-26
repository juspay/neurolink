/**
 * Push-driven async iterable shared by the transcription sockets: socket
 * frames are pushed in, `transcribeStream()` pulls them out.
 *
 * The queue reports its level to whoever feeds it, so a socket can be paused
 * when audio arrives faster than the engine takes it and resumed once the
 * backlog drains (TCP backpressure, instead of buffering the whole burst).
 * Every queue also charges its bytes to one process-wide budget, so a burst
 * of uploads across many sockets cannot exhaust the process.
 *
 * @module server/websocket/frameQueue
 */

/** Queued bytes across every `FrameQueue` of this process. */
let processQueuedBytes = 0;

/** What every queue in the process holds right now, for caps and tests. */
export function totalQueuedFrameBytes(): number {
  return processQueuedBytes;
}

/** Push-driven async iterable: socket frames in, `transcribeStream()` pulls. */
export class FrameQueue implements AsyncIterable<Buffer> {
  private readonly frames: Buffer[] = [];
  private waiting: ((result: IteratorResult<Buffer>) => void) | undefined;
  private ended = false;
  private onLevel: ((queuedBytes: number) => void) | undefined;
  queuedBytes = 0;

  /** Called after every change of `queuedBytes`, with the new level. */
  setLevelListener(
    listener: ((queuedBytes: number) => void) | undefined,
  ): void {
    this.onLevel = listener;
  }

  push(frame: Buffer): void {
    if (this.ended) {
      return;
    }
    if (this.waiting) {
      const resolve = this.waiting;
      this.waiting = undefined;
      resolve({ value: frame, done: false });
      return;
    }
    this.frames.push(frame);
    this.charge(frame.length);
  }

  /**
   * No more frames will arrive; the ones already queued are still handed
   * out, so a recording whose `end` frame followed its audio is transcribed
   * whole. The consumer's `return()` (see below) is what discards.
   */
  end(): void {
    if (this.ended) {
      return;
    }
    this.ended = true;
    if (this.waiting) {
      const resolve = this.waiting;
      this.waiting = undefined;
      resolve({ value: undefined, done: true });
    }
  }

  /** The consumer is gone: whatever it did not pull leaves the process budget. */
  private discard(): void {
    this.end();
    if (this.queuedBytes > 0) {
      this.charge(-this.queuedBytes);
    }
    this.frames.length = 0;
  }

  private charge(delta: number): void {
    this.queuedBytes += delta;
    processQueuedBytes = Math.max(0, processQueuedBytes + delta);
    this.onLevel?.(this.queuedBytes);
  }

  [Symbol.asyncIterator](): AsyncIterator<Buffer> {
    return {
      next: () => {
        const frame = this.frames.shift();
        if (frame) {
          this.charge(-frame.length);
          return Promise.resolve({ value: frame, done: false });
        }
        if (this.ended) {
          return Promise.resolve({ value: undefined, done: true });
        }
        return new Promise((resolve) => {
          this.waiting = resolve;
        });
      },
      return: () => {
        this.discard();
        return Promise.resolve({ value: undefined, done: true });
      },
    };
  }
}
