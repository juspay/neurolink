export type RawStreamCapture = {
  totalBytes: number;
  text: string;
  truncated: boolean;
};

export type RawStreamCaptureResult = {
  stream: TransformStream<Uint8Array, Uint8Array>;
  capture: Promise<RawStreamCapture>;
};

/** Maximum bytes to capture before stopping accumulation (1 MB). */
const MAX_CAPTURE_BYTES = 1024 * 1024;
const TRUNCATION_MARKER = "\n...[TRUNCATED]";

export function createRawStreamCapture(): RawStreamCaptureResult {
  const decoder = new TextDecoder();
  const chunks: string[] = [];
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
    const finalChunk = decoder.decode();
    if (finalChunk) {
      if (capturedBytes < MAX_CAPTURE_BYTES) {
        const remainingBytes = MAX_CAPTURE_BYTES - capturedBytes;
        chunks.push(finalChunk.slice(0, remainingBytes));
        capturedBytes += Math.min(finalChunk.length, remainingBytes);
      } else if (!truncated) {
        chunks.push(TRUNCATION_MARKER);
        truncated = true;
      }
    }
    resolveCapture({
      totalBytes,
      text: chunks.join(""),
      truncated,
    });
  }

  const transform = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      controller.enqueue(chunk);
      totalBytes += chunk.byteLength;
      if (capturedBytes < MAX_CAPTURE_BYTES) {
        const decoded = decoder.decode(chunk, { stream: true });
        const remainingBytes = MAX_CAPTURE_BYTES - capturedBytes;
        const slice = decoded.slice(0, remainingBytes);
        chunks.push(slice);
        capturedBytes += Math.min(decoded.length, remainingBytes);
        if (decoded.length > remainingBytes && !truncated) {
          chunks.push(TRUNCATION_MARKER);
          truncated = true;
        }
      } else if (!truncated) {
        chunks.push(TRUNCATION_MARKER);
        truncated = true;
      }
    },
    flush() {
      settle();
    },
  });

  const innerWriter = transform.writable.getWriter();

  const writable = new WritableStream<Uint8Array>({
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

  return {
    stream: {
      readable: transform.readable,
      writable,
    },
    capture,
  };
}
