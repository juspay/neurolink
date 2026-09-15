import type {
  RawStreamCapture,
  RawStreamCaptureResult,
} from "../types/index.js";

/** Maximum bytes to capture before stopping accumulation (1 MB). */
const MAX_CAPTURE_BYTES = 1024 * 1024;
// Payload accounting across concurrent stream observers, independent of the
// worker's clone/publication pool. Never retain an unbounded number of prefixes.
const MAX_PENDING_CAPTURE_BYTES = 16 * 1024 * 1024;
let pendingCaptureBytes = 0;
const TRUNCATION_MARKER = "\n...[TRUNCATED]";

export function createRawStreamCapture(): RawStreamCaptureResult {
  const decoder = new TextDecoder();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  let capturedBytes = 0;
  let truncated = false;
  let resolved = false;

  let resolveCapture!: (value: RawStreamCapture) => void;
  const capture = new Promise<RawStreamCapture>((resolve) => {
    resolveCapture = resolve;
  });

  function settle(): void {
    if (resolved) {
      return;
    }
    resolved = true;
    const text =
      chunks.map((chunk) => decoder.decode(chunk, { stream: true })).join("") +
      (truncated ? "" : decoder.decode());
    pendingCaptureBytes -= capturedBytes;
    chunks.length = 0;
    resolveCapture({
      totalBytes,
      text: text + (truncated ? TRUNCATION_MARKER : ""),
      truncated,
    });
  }

  const transform = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      controller.enqueue(chunk);
      totalBytes += chunk.byteLength;
      if (!truncated && capturedBytes < MAX_CAPTURE_BYTES) {
        const remainingBytes = Math.min(
          MAX_CAPTURE_BYTES - capturedBytes,
          Math.max(0, MAX_PENDING_CAPTURE_BYTES - pendingCaptureBytes),
        );
        // Buffer.slice is a view; copy to avoid retaining the whole wire chunk.
        const slice = Uint8Array.from(chunk.subarray(0, remainingBytes));
        chunks.push(slice);
        capturedBytes += slice.byteLength;
        pendingCaptureBytes += slice.byteLength;
        truncated = slice.byteLength < chunk.byteLength;
      }
      truncated ||= totalBytes > MAX_CAPTURE_BYTES;
    },
    flush() {
      settle();
    },
  });

  const innerWriter = transform.writable.getWriter();
  let writableController: WritableStreamDefaultController;

  const writable = new WritableStream<Uint8Array>({
    start(controller) {
      writableController = controller;
    },
    write(chunk) {
      return innerWriter.write(chunk);
    },
    close() {
      return innerWriter.close();
    },
    abort(reason) {
      settle();
      return innerWriter.abort(reason);
    },
  });

  // A downstream reader cancellation errors the TransformStream's writable
  // side, but this wrapper otherwise hides that state from the upstream pipe.
  // Mirror it onto the wrapper so cancellation reaches the source reader.
  void innerWriter.closed.catch((reason) => {
    settle();
    try {
      writableController.error(reason);
    } catch {
      // The wrapper may already be closing or aborted.
    }
  });

  const innerReader = transform.readable.getReader();
  const readable = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await innerReader.read();
        if (done) {
          controller.close();
        } else {
          controller.enqueue(value);
        }
      } catch (error) {
        controller.error(error);
      }
    },
    async cancel(reason) {
      settle();
      try {
        writableController.error(reason);
      } catch {
        // The wrapper may already be closing or aborted.
      }
      await Promise.allSettled([
        innerReader.cancel(reason),
        innerWriter.abort(reason),
      ]);
    },
  });

  return {
    stream: {
      readable,
      writable,
    },
    capture,
  };
}
