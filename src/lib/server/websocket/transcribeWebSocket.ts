/**
 * Transcribe WebSocket — `transcribeStream()` over a socket.
 *
 * Protocol (one transcription per connection):
 * 1. The client's first frame is TEXT: a JSON config with the fields of
 *    `POST /agent/transcribe` minus the audio (`provider`, `model`,
 *    `language`, `dictionary`, `correction`, `fallback`, `streaming` …).
 * 2. Then BINARY frames of PCM16LE mono audio at `streaming.sampleRate`
 *    (default 16000).
 * 3. A TEXT frame `{"type":"end"}` (or closing the socket) ends the audio; the
 *    server flushes the last utterance.
 *
 * The server sends one TEXT frame per `TranscribeStreamEvent` (JSON), then
 * closes with 1000. A bad config is answered with an `error` event and close
 * code 1008.
 *
 * The route adapters do not handle upgrades, so this attaches to the Node
 * `http.Server` the caller owns, next to whatever else is listening there; it
 * answers only upgrades on its own path.
 *
 * @module server/websocket/transcribeWebSocket
 */

import type { IncomingMessage, Server as HttpServer } from "node:http";
import type { Duplex } from "node:stream";
import type { NeuroLink } from "../../neurolink.js";
import type {
  ServerTranscribeWebSocketOptions,
  TranscribeStreamEvent,
  TranscribeStreamOptions,
} from "../../types/index.js";
import { logger } from "../../utils/logger.js";
import { timingSafeEqualString } from "../voice/tokenCompare.js";
import { TranscribeStreamConfigSchema } from "../utils/validation.js";

const DEFAULT_PATH = "/v1/audio/transcriptions/stream";
/** Audio waiting for the engine beyond this (about 8.5 min at 16 kHz) closes the socket. */
const MAX_QUEUED_BYTES = 16 * 1024 * 1024;

/** Push-driven async iterable: socket frames in, `transcribeStream()` pulls. */
class FrameQueue implements AsyncIterable<Buffer> {
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

/**
 * `true` when the upgrade's `Origin` is on the allow-list, the list allows
 * any origin, or the request carries no `Origin` (not a browser).
 */
function isOriginAllowed(
  req: IncomingMessage,
  allowed: readonly string[] | undefined,
): boolean {
  if (!allowed || allowed.includes("*")) {
    return true;
  }
  const origin = req.headers.origin;
  if (typeof origin !== "string" || origin.length === 0) {
    return true;
  }
  const wanted = origin.trim().toLowerCase();
  return allowed.some((o) => o.trim().toLowerCase() === wanted);
}

function isAuthorized(
  req: IncomingMessage,
  token: string | readonly string[] | undefined,
): boolean {
  const tokens = (typeof token === "string" ? [token] : (token ?? [])).filter(
    (t) => t.length > 0,
  );
  if (tokens.length === 0) {
    return true;
  }
  const header = req.headers.authorization;
  const headerToken =
    typeof header === "string" && header.startsWith("Bearer ")
      ? header.slice(7)
      : undefined;
  let urlToken: string | undefined;
  try {
    urlToken =
      new URL(req.url ?? "/", "http://localhost").searchParams.get("token") ??
      undefined;
  } catch {
    urlToken = undefined;
  }
  const provided = headerToken ?? urlToken;
  return (
    provided !== undefined &&
    tokens.some((t) => timingSafeEqualString(provided, t))
  );
}

function pathOf(req: IncomingMessage): string {
  try {
    return new URL(req.url ?? "/", "http://localhost").pathname;
  } catch {
    return "";
  }
}

/**
 * Serve `transcribeStream()` on `path` (default
 * `/v1/audio/transcriptions/stream`) of an existing HTTP server.
 *
 * @example
 * ```typescript
 * const server = http.createServer(app);
 * const ws = await attachTranscribeWebSocket(server, neurolink, {
 *   authToken: process.env.NEUROLINK_SERVER_API_KEY?.split(","),
 * });
 * server.listen(3000);
 * // later: ws.close();
 * ```
 */
export async function attachTranscribeWebSocket(
  server: HttpServer,
  neurolink: NeuroLink,
  options: ServerTranscribeWebSocketOptions = {},
): Promise<{ close: () => void }> {
  // Loaded on use so `ws` stays off the package's static import graph.
  const { WebSocketServer, WebSocket } = await import("ws");
  const path = options.path ?? DEFAULT_PATH;
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: options.maxPayload ?? 1_048_576,
  });

  const onUpgrade = (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    if (pathOf(req) !== path) {
      return; // Someone else's upgrade.
    }
    if (!isOriginAllowed(req, options.allowedOrigins)) {
      socket.write("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }
    if (!isAuthorized(req, options.authToken)) {
      socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (client) => {
      wss.emit("connection", client, req);
    });
  };
  server.on("upgrade", onUpgrade);

  wss.on("connection", (client: InstanceType<typeof WebSocket>) => {
    const queue = new FrameQueue();
    let started = false;

    const send = (event: TranscribeStreamEvent): boolean => {
      if (client.readyState !== WebSocket.OPEN) {
        return false;
      }
      client.send(JSON.stringify(event));
      return true;
    };

    const run = async (config: Omit<TranscribeStreamOptions, "audio">) => {
      try {
        for await (const event of neurolink.transcribeStream({
          ...config,
          audio: queue,
        })) {
          if (!send(event)) {
            break; // The client is gone; stop pulling.
          }
        }
        if (client.readyState === WebSocket.OPEN) {
          client.close(1000, "done");
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.warn("[TranscribeWebSocket] stream failed", { error: message });
        send({ type: "error", message, recoverable: false });
        if (client.readyState === WebSocket.OPEN) {
          client.close(1011, "transcription failed");
        }
      }
    };

    client.on(
      "message",
      (data: Buffer | ArrayBuffer | Buffer[], isBinary: boolean) => {
        const frame = Buffer.isBuffer(data)
          ? data
          : Array.isArray(data)
            ? Buffer.concat(data)
            : Buffer.from(data);
        if (!started) {
          if (isBinary) {
            send({
              type: "error",
              message:
                "The first frame must be a JSON config (text), before any audio",
              recoverable: false,
            });
            client.close(1008, "config first");
            return;
          }
          let parsed: unknown;
          try {
            parsed = JSON.parse(frame.toString("utf-8"));
          } catch {
            parsed = undefined;
          }
          const config = TranscribeStreamConfigSchema.safeParse(parsed);
          if (!config.success) {
            send({
              type: "error",
              message: `Invalid config: ${config.error.issues
                .map(
                  (issue) =>
                    `${issue.path.join(".") || "config"} ${issue.message}`,
                )
                .join("; ")}`,
              recoverable: false,
            });
            client.close(1008, "invalid config");
            return;
          }
          started = true;
          void run(config.data);
          return;
        }
        if (isBinary) {
          queue.push(frame);
          if (queue.queuedBytes > MAX_QUEUED_BYTES) {
            send({
              type: "error",
              message: "Audio is arriving faster than it can be transcribed",
              recoverable: false,
            });
            queue.end();
            client.close(1009, "backlog");
          }
          return;
        }
        // Any text frame after the config ends the audio ({"type":"end"}).
        queue.end();
      },
    );

    client.on("close", () => queue.end());
    client.on("error", () => queue.end());
  });

  return {
    close: () => {
      server.off("upgrade", onUpgrade);
      for (const client of wss.clients) {
        client.terminate();
      }
      wss.close();
    },
  };
}
