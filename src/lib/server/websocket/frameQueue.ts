/**
 * Push-driven async iterable shared by the transcription sockets: socket
 * frames are pushed in, `transcribeStream()` pulls them out.
 *
 * @module server/websocket/frameQueue
 */

/** Push-driven async iterable: socket frames in, `transcribeStream()` pulls. */
export class FrameQueue implements AsyncIterable<Buffer> {
  private readonly frames: Buffer[] = [];
  private waiting: ((result: IteratorResult<Buffer>) => void) | undefined;
  private ended = false;
  queuedBytes = 0;

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
    this.queuedBytes += frame.length;
  }

  end(): void {
    this.ended = true;
    if (this.waiting) {
      const resolve = this.waiting;
      this.waiting = undefined;
      resolve({ value: undefined, done: true });
    }
  }

  [Symbol.asyncIterator](): AsyncIterator<Buffer> {
    return {
      next: () => {
        const frame = this.frames.shift();
        if (frame) {
          this.queuedBytes -= frame.length;
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
        this.end();
        return Promise.resolve({ value: undefined, done: true });
      },
    };
  }
}
