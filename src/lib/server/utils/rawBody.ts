/**
 * Raw request bodies and raw responses for the server adapters.
 *
 * The adapters parse JSON (and url-encoded forms) into `ctx.body`. Routes that
 * take uploads — `POST /v1/audio/transcriptions` takes `multipart/form-data`
 * the way OpenAI's API does — need the bytes instead, so for the content types
 * below every adapter hands the route the unparsed body as a `Buffer`, bounded
 * by `bodyParser.maxSize`. A route that must answer in a wire format other than
 * the adapters' `{ data, metadata }` envelope (an OpenAI-compatible route, a
 * plain-text response) returns a web `Response`, which every adapter sends as is.
 *
 * @module server/utils/rawBody
 */

/** Content types whose body reaches the route as a `Buffer`. */
const RAW_BODY_CONTENT_TYPE =
  /^\s*(multipart\/form-data|application\/octet-stream|audio\/[\w.+-]+)\s*(;|$)/i;

/** `true` for a content type whose body the adapters pass through unparsed. */
export function isRawBodyContentType(contentType: unknown): boolean {
  return (
    typeof contentType === "string" && RAW_BODY_CONTENT_TYPE.test(contentType)
  );
}

/** "10mb" / "512kb" / "1gb" / a byte count → bytes, or `undefined` when it is none of those. */
export function tryParseByteLimit(
  limit: string | number | undefined,
): number | undefined {
  if (typeof limit === "number" && Number.isFinite(limit) && limit > 0) {
    return limit;
  }
  const match =
    typeof limit === "string"
      ? limit.trim().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/i)
      : null;
  if (!match) {
    return undefined;
  }
  const units: Record<string, number> = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
  };
  const bytes = Math.floor(
    Number(match[1]) * units[(match[2] ?? "b").toLowerCase()],
  );
  // A digit string long enough to overflow reads as Infinity, which no body
  // can exceed: treat it as unparseable so the caller's default applies.
  return Number.isFinite(bytes) ? bytes : undefined;
}

/** "10mb" / "512kb" / "1gb" / a byte count → bytes. Falls back to 10 MB. */
export function parseByteLimit(limit: string | number | undefined): number {
  return tryParseByteLimit(limit) ?? 10 * 1024 * 1024;
}

/** Thrown when a raw body grows past the adapter's `maxSize`. */
export class RawBodyTooLargeError extends Error {
  readonly status = 413;
  constructor(limit: number) {
    super(`Request body exceeds the server's ${limit}-byte limit`);
    this.name = "RawBodyTooLargeError";
  }
}

/** Read a Node request stream into one `Buffer`, refusing more than `maxBytes`. */
export async function readRawBody(
  stream: AsyncIterable<Buffer | string>,
  maxBytes: number,
): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of stream) {
    const buffer = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
    total += buffer.length;
    if (total > maxBytes) {
      throw new RawBodyTooLargeError(maxBytes);
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

/** A web `ReadableStream` of bytes as an async iterable of Buffers, releasing the reader on exit. */
export async function* webStreamChunks(
  stream: ReadableStream<Uint8Array>,
): AsyncIterable<Buffer> {
  const reader = stream.getReader();
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) {
        return;
      }
      if (value) {
        yield Buffer.from(value.buffer, value.byteOffset, value.byteLength);
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/** Bodies already read for a request, so a second read never hits a consumed stream. */
const boundedBodies = new WeakMap<Request, Buffer | RawBodyTooLargeError>();

/**
 * Read a web `Request` body, refusing more than `maxBytes`.
 *
 * A declared `Content-Length` over the limit is refused without reading
 * anything. Otherwise the stream is read chunk by chunk and stopped at the
 * limit, so a chunked body without a `Content-Length` cannot be buffered whole.
 * Over the limit the result is the error itself rather than a throw: a throw
 * from a middleware lands in the framework's error handler, which answers 500.
 *
 * The outcome is kept per request, because a web stream can only be read once
 * and the body may be asked for more than once (middleware, then route).
 */
export async function readBoundedRequestBody(
  request: Request,
  maxBytes: number,
): Promise<Buffer | RawBodyTooLargeError> {
  if (Number(request.headers.get("content-length") ?? 0) > maxBytes) {
    return new RawBodyTooLargeError(maxBytes);
  }
  const cached = boundedBodies.get(request);
  if (cached !== undefined) {
    return cached;
  }
  const stream = request.body;
  if (!stream) {
    return Buffer.alloc(0);
  }
  let outcome: Buffer | RawBodyTooLargeError;
  try {
    outcome = await readRawBody(webStreamChunks(stream), maxBytes);
  } catch (error) {
    if (!(error instanceof RawBodyTooLargeError)) {
      throw error;
    }
    await stream.cancel().catch(() => undefined);
    outcome = error;
  }
  boundedBodies.set(request, outcome);
  return outcome;
}

/** A web `Response` returned by a route handler. */
export function isWebResponse(value: unknown): value is Response {
  return typeof Response !== "undefined" && value instanceof Response;
}

/** Status, headers and body bytes of a web `Response`, for adapters that write to a Node response. */
export async function readWebResponse(response: Response): Promise<{
  status: number;
  headers: Record<string, string>;
  body: Buffer;
}> {
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });
  return {
    status: response.status,
    headers,
    body: Buffer.from(await response.arrayBuffer()),
  };
}
