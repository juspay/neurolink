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

/** "10mb" / "512kb" / "1gb" / a byte count → bytes. Falls back to 10 MB. */
export function parseByteLimit(limit: string | number | undefined): number {
  if (typeof limit === "number" && Number.isFinite(limit) && limit > 0) {
    return limit;
  }
  const match =
    typeof limit === "string"
      ? limit.trim().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/i)
      : null;
  if (!match) {
    return 10 * 1024 * 1024;
  }
  const units: Record<string, number> = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
  };
  return Math.floor(Number(match[1]) * units[(match[2] ?? "b").toLowerCase()]);
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
