/**
 * Bounded JSON and form body reads for the Express adapter.
 *
 * `express.json()` and `express.urlencoded()` (body-parser) refuse a body over
 * their limit with a 413, but only after the whole request has been taken off
 * the socket: a declared Content-Length over the limit is seen at once and the
 * body is still drained, and a chunked body is read to its end. Nothing has
 * authenticated the request at that point, so a client could make the server
 * receive any amount of data for the price of one 413.
 *
 * `createBoundedBodyParser` wraps a body-parser middleware so the bytes are
 * read here, up to the limit, and handed to that same middleware to parse. Which
 * requests are parsed, charset handling, strict JSON, the qs options and the
 * error each failure carries all stay body-parser's, because body-parser still
 * makes those decisions: it is asked first, from the headers alone, whether it
 * would read the request, and then parses the bytes it is given. What changes is
 * who reads the socket and what happens at the limit. A body over the limit is
 * refused without reading it (declared Content-Length) or at the limit (chunked,
 * or a compressed body that inflates past it), and the connection is closed so
 * the client stops sending.
 *
 * `express.raw()` (uploads) is not wrapped.
 *
 * @module server/utils/expressBody
 */

import type { ServerResponse } from "node:http";
import { Readable, type Transform } from "node:stream";
import * as zlib from "node:zlib";
import type {
  ServerBodyParserVerdict,
  ServerBoundedBodyRead,
  ServerBufferedRequest,
  ServerNodeMiddleware,
  ServerParsedNodeRequest,
} from "../../types/index.js";
import { tryParseByteLimit } from "./rawBody.js";

const noop = (): void => undefined;

/** The error body-parser raises for an over-limit body, which the adapter's error handler answers 413. */
function bodyParserError(
  status: number,
  message: string,
  type: string,
  details: Record<string, unknown> = {},
): Error {
  return Object.assign(new Error(message), {
    status,
    statusCode: status,
    expose: status < 500,
    type,
    ...details,
  });
}

const entityTooLarge = (limit: number, received?: number): Error =>
  bodyParserError(413, "request entity too large", "entity.too.large", {
    limit,
    ...(received === undefined ? {} : { received }),
  });

/** A Content-Encoding body-parser inflates, and nothing else. */
function decompressorFor(encoding: string): (() => Transform) | undefined {
  switch (encoding) {
    case "gzip":
      return zlib.createGunzip;
    case "deflate":
      return zlib.createInflate;
    case "br":
      return zlib.createBrotliDecompress;
    case "zstd":
      // Node 22.15 and later.
      return typeof zlib.createZstdDecompress === "function"
        ? zlib.createZstdDecompress
        : undefined;
    default:
      return undefined;
  }
}

/** body-parser's own "already handled" test: the request has been read off, or cannot be. */
const isRequestFinished = (req: ServerParsedNodeRequest): boolean =>
  ("upgrade" in req && req.upgrade === true) ||
  !req.socket?.readable ||
  (req.complete && !req.readable);

/** A request that is already in memory, to hand a body-parser middleware in place of the socket. */
function bufferedRequest(
  headers: ServerBufferedRequest["headers"],
  bytes: Buffer,
  body: unknown,
): ServerBufferedRequest {
  let pushed = false;
  const stream = new Readable({
    read() {
      if (!pushed) {
        pushed = true;
        if (bytes.length > 0) {
          this.push(bytes);
        }
        this.push(null);
      }
    },
  });
  return Object.assign(stream, { headers, body });
}

/**
 * Ask a body-parser middleware what it would do with this request, without
 * giving it a body. It is run on an empty one: what it decides from the headers
 * (not a body, not its type, a charset it refuses) comes back as it would
 * have, and so does what it only finds out when it starts to read (a charset
 * the decoder lacks). The Content-Encoding is left off because inflating is
 * done here, and the Content-Length is zeroed so the declared size, which is
 * checked here, does not stand in the way.
 */
function askParser(
  parser: ServerNodeMiddleware,
  req: ServerParsedNodeRequest,
  res: ServerResponse,
): Promise<ServerBodyParserVerdict> {
  const headers = { ...req.headers };
  delete headers["content-encoding"];
  delete headers["transfer-encoding"];
  if (
    req.headers["transfer-encoding"] !== undefined ||
    req.headers["content-length"] !== undefined
  ) {
    headers["content-length"] = "0";
  }
  const before: unknown = "body" in req ? req.body : undefined;
  const probe = bufferedRequest(headers, Buffer.alloc(0), before);

  return new Promise((resolve) => {
    let synchronous = true;
    parser(probe as ServerParsedNodeRequest, res, (error?: unknown) => {
      if (error !== undefined) {
        resolve({ kind: "reject", error, beforeRead: synchronous });
      } else if (probe.body !== before) {
        resolve({ kind: "parse" });
      } else {
        resolve({ kind: "skip", body: probe.body });
      }
    });
    synchronous = false;
  });
}

/**
 * How far past the limit the raw bytes of a compressed body may run. The limit
 * is on what a body inflates to, but the bytes on the wire are capped too:
 * empty gzip members inflate to nothing, and so do the zeros Node lets follow a
 * complete gzip stream, so without a cap a stream of either is read until the
 * client stops. The slack covers the framing a real encoder adds (deflate's
 * stored blocks carry 5 bytes per 64 KiB).
 */
const COMPRESSED_WIRE_SLACK = 64 * 1024;

/**
 * Read a request body, refusing more than `maxBytes` (of what is inflated, when
 * the request is compressed, with the raw bytes capped at `maxBytes` plus
 * {@link COMPRESSED_WIRE_SLACK}). Reading stops at the limit and the request is
 * left paused, not drained. Events rather than `for await`: leaving an async
 * iterator early destroys the request, and its socket with it, before an answer
 * can be sent.
 */
function readBounded(
  req: ServerParsedNodeRequest,
  maxBytes: number,
  decompressor: Transform | undefined,
): Promise<ServerBoundedBodyRead> {
  return new Promise((resolve, reject) => {
    const source: Readable = decompressor ?? req;
    const chunks: Buffer[] = [];
    const wireCap = maxBytes + COMPRESSED_WIRE_SLACK;
    let received = 0;
    let wire = 0;
    // A compressed body is complete; the rest of the request is being read off.
    let draining = false;
    let settled = false;

    const release = (): void => {
      source.off("data", onData);
      source.off("end", onEnd);
      source.off("error", onFail);
      req.off("data", onWire);
      req.off("end", onRequestEnd);
      req.off("error", onFail);
      req.off("close", onClose);
    };
    const detachDecompressor = (): void => {
      if (decompressor) {
        req.unpipe(decompressor);
        decompressor.on("error", noop);
        decompressor.destroy();
      }
    };
    const stop = (): void => {
      detachDecompressor();
      req.pause();
    };
    const settle = (outcome: () => void): void => {
      if (!settled) {
        settled = true;
        release();
        outcome();
      }
    };
    const finish = (closeConnection: boolean): void => {
      settle(() => resolve({ bytes: Buffer.concat(chunks), closeConnection }));
    };
    const aborted = (): Error =>
      bodyParserError(400, "request aborted", "request.aborted", {
        code: "ECONNABORTED",
        received,
      });

    function onData(chunk: Buffer | string): void {
      const buffer = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
      received += buffer.length;
      if (received > maxBytes) {
        settle(() => {
          stop();
          reject(entityTooLarge(maxBytes, received));
        });
        return;
      }
      chunks.push(buffer);
    }
    function onWire(chunk: Buffer | string): void {
      wire += chunk.length;
      if (wire <= wireCap) {
        return;
      }
      if (draining) {
        // The body is whole; what keeps arriving is not part of it.
        req.pause();
        finish(true);
        return;
      }
      settle(() => {
        stop();
        reject(entityTooLarge(maxBytes, wire));
      });
    }
    function onEnd(): void {
      if (!decompressor) {
        finish(false);
        return;
      }
      // The rest of the request, if any, is not part of the body: read it off
      // up to the cap, so the connection can be kept.
      detachDecompressor();
      if (req.complete) {
        req.resume();
        finish(false);
        return;
      }
      draining = true;
      source.off("data", onData);
      source.off("end", onEnd);
      source.off("error", onFail);
      req.on("end", onRequestEnd);
      req.resume();
    }
    function onRequestEnd(): void {
      finish(false);
    }
    function onFail(error: Error): void {
      if (draining) {
        finish(true);
        return;
      }
      settle(() => {
        stop();
        reject(error);
      });
    }
    function onClose(): void {
      // A request that arrived whole closes once it has been read, which for a
      // compressed one can be before the inflating has finished.
      if (req.complete) {
        return;
      }
      if (draining) {
        finish(true);
        return;
      }
      settle(() => {
        stop();
        reject(aborted());
      });
    }

    if (req.destroyed && !req.complete) {
      settle(() => reject(aborted()));
      return;
    }
    source.on("data", onData);
    source.on("end", onEnd);
    source.on("error", onFail);
    req.on("close", onClose);
    if (decompressor) {
      req.on("error", onFail);
      req.on("data", onWire);
      req.pipe(decompressor);
    }
  });
}

/** Answer the request with `error` and close the connection, so a client still sending stops. */
function refuse(
  res: ServerResponse,
  next: (error?: unknown) => void,
  error: unknown,
): void {
  if (!res.headersSent) {
    res.setHeader("Connection", "close");
  }
  next(error);
}

async function parseBounded(
  parser: ServerNodeMiddleware,
  maxBytes: number,
  req: ServerParsedNodeRequest,
  res: ServerResponse,
  next: (error?: unknown) => void,
): Promise<void> {
  try {
    if (isRequestFinished(req)) {
      next();
      return;
    }
    const verdict = await askParser(parser, req, res);
    if (verdict.kind === "skip") {
      req.body = verdict.body;
      next();
      return;
    }
    if (verdict.kind === "reject" && verdict.beforeRead) {
      refuse(res, next, verdict.error);
      return;
    }

    const encoding = (
      req.headers["content-encoding"] || "identity"
    ).toLowerCase();
    const inflate =
      encoding === "identity" ? undefined : decompressorFor(encoding);
    if (encoding !== "identity" && !inflate) {
      refuse(
        res,
        next,
        bodyParserError(
          415,
          `unsupported content encoding "${encoding}"`,
          "encoding.unsupported",
          { encoding },
        ),
      );
      return;
    }
    // Compressed, the declared length is the compressed size, which says
    // nothing about the body.
    const declared = Number.parseInt(String(req.headers["content-length"]), 10);
    if (!inflate && declared > maxBytes) {
      refuse(res, next, entityTooLarge(maxBytes));
      return;
    }
    if (verdict.kind === "reject") {
      refuse(res, next, verdict.error);
      return;
    }

    const before: unknown = "body" in req ? req.body : undefined;
    let read: ServerBoundedBodyRead;
    try {
      read = await readBounded(req, maxBytes, inflate?.());
    } catch (error) {
      refuse(res, next, error);
      return;
    }
    if (read.closeConnection && !res.headersSent) {
      res.setHeader("Connection", "close");
    }
    const { bytes } = read;

    const headers = { ...req.headers, "content-length": String(bytes.length) };
    delete headers["content-encoding"];
    delete headers["transfer-encoding"];
    const replay = bufferedRequest(headers, bytes, before);
    parser(replay as ServerParsedNodeRequest, res, (error?: unknown) => {
      if (error !== undefined) {
        next(error);
        return;
      }
      req.body = replay.body;
      next();
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Wrap a body-parser middleware (`express.json()`, `express.urlencoded()`) so a
 * body is read only as far as `limit`. `limit` is the one the middleware was
 * built with. A limit that cannot be read as a byte count here is left to the
 * middleware alone.
 */
export function createBoundedBodyParser(
  parser: ServerNodeMiddleware,
  limit: string | number | undefined,
): ServerNodeMiddleware {
  const maxBytes = tryParseByteLimit(limit);
  if (maxBytes === undefined) {
    return parser;
  }
  return (req, res, next) => {
    void parseBounded(parser, maxBytes, req, res, next);
  };
}
