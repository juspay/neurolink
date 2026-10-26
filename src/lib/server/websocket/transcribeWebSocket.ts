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
 *    server flushes the last utterance. `{"type":"output","languages":[…]}`
 *    changes the output languages from the next utterance on; any other text
 *    frame ends the audio, as before.
 *
 * The server sends one TEXT frame per `TranscribeStreamEvent` (JSON), then
 * closes with 1000. A bad config is answered with an `error` event and close
 * code 1008.
 *
 * Sessions (one call, several speakers, listeners in their own languages):
 * a speaker connects to the stream path with `?session=<id>&speaker=<name>`
 * and uses the protocol above; a listener connects to the subscribe path
 * (default `<path>/subscribe`) with `?session=<id>` and sends
 * `{"type":"subscribe","languages":["es"],"speakers":[…]}` — again at any time
 * to change them. Listeners receive every event of the speakers they follow,
 * tagged with `speaker`, and only the `output` events of their languages; a
 * session renders each utterance once into the union of its listeners'
 * languages. A session lives while a speaker or a listener is connected. The
 * speaker that opens a session may add `&secret=<value>`; every later speaker
 * and listener must then present the same secret, so a session id alone does
 * not admit a stranger (`requireSessionSecret` makes the secret mandatory).
 *
 * Limits: sockets are capped in all and per remote address (503 before the
 * handshake), a socket that sends faster than the engine takes is paused at a
 * high-water mark, and queued audio is budgeted across the process.
 *
 * OpenAI Realtime transcription (default path `/v1/realtime`,
 * `?intent=transcription`): the same pipeline behind OpenAI's protocol, for
 * clients that already speak it (see realtimeTranscription.ts).
 *
 * The route adapters do not handle upgrades, so this attaches to the Node
 * `http.Server` the caller owns, next to whatever else is listening there; it
 * answers only upgrades on its own path.
 *
 * @module server/websocket/transcribeWebSocket
 */

import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import type { IncomingMessage, Server as HttpServer } from "node:http";
import { join } from "node:path";
import type { Duplex } from "node:stream";
import type { NeuroLink } from "../../neurolink.js";
import type {
  ServerTranscribeWebSocketOptions,
  TranscribeStreamEvent,
  TranscribeStreamOptions,
  TranscriptionSessionEvent,
  TranscriptionSubscription,
} from "../../types/index.js";
import { logger } from "../../utils/logger.js";
import { timingSafeEqualString } from "../voice/tokenCompare.js";
import { canonicalAddress, isLoopbackAddress } from "../utils/clientAddress.js";
import {
  TranscribeOutputControlSchema,
  TranscribeStreamConfigSchema,
  TranscribeSubscribeSchema,
} from "../utils/validation.js";
import { fileModeStreamOptions } from "../../voice/transcribe.js";
import { TranscriptionSession } from "../../voice/session/transcriptionSession.js";
import { FrameQueue, totalQueuedFrameBytes } from "./frameQueue.js";
import {
  resolveRealtimeProfiles,
  serveRealtimeTranscription,
} from "./realtimeTranscription.js";

const DEFAULT_PATH = "/v1/audio/transcriptions/stream";
const DEFAULT_REALTIME_PATH = "/v1/realtime";
/** Audio waiting for the engine beyond this (about 8.5 min at 16 kHz) closes the socket. */
const MAX_QUEUED_BYTES = 16 * 1024 * 1024;
/** In file mode the whole recording may be queued at once: 512 MB is about 4.5 hours of 16 kHz PCM. */
const MAX_QUEUED_BYTES_FILE = 512 * 1024 * 1024;
/** Queued audio per socket above which the socket is paused until the engine catches up. */
const DEFAULT_HIGH_WATER_MARK = 8 * 1024 * 1024;
/** Queued audio across every socket of the process. */
const DEFAULT_MAX_TOTAL_QUEUED_BYTES = 512 * 1024 * 1024;
const DEFAULT_MAX_CONNECTIONS = 100;
const DEFAULT_MAX_CONNECTIONS_PER_ADDRESS = 16;
/** Subprotocol carrying the server's API key for a browser, next to `neurolink`. */
const SUBPROTOCOL_KEY_PREFIX = "neurolink-api-key.";
/** OpenAI's browser SDK sends the key as this subprotocol; honoured on the realtime path. */
const OPENAI_SUBPROTOCOL_KEY_PREFIX = "openai-insecure-api-key.";

/** Answer an upgrade before the handshake, with a status the client can read. */
function refuseUpgrade(socket: Duplex, status: number, reason: string): void {
  socket.write(`HTTP/1.1 ${status} ${reason}\r\nConnection: close\r\n\r\n`);
  socket.destroy();
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

/** The configured token(s), empty when the stream is open. */
function configuredTokens(
  token: string | readonly string[] | undefined,
): string[] {
  return (typeof token === "string" ? [token] : (token ?? [])).filter(
    (t) => t.length > 0,
  );
}

/** The subprotocols the client offered, trimmed. */
function offeredProtocols(req: IncomingMessage): string[] {
  return String(req.headers["sec-websocket-protocol"] ?? "")
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/**
 * Whether the upgrade carries one of `tokens`. A browser cannot set headers,
 * so besides `Authorization: Bearer` the key may ride in the subprotocol list
 * as `neurolink-api-key.<key>` (and, on the realtime path, as OpenAI's
 * `openai-insecure-api-key.<key>`). `?token=` in the URL is accepted only when
 * the operator allows it: a URL is written to access logs and `Referer`
 * headers, so a key there leaks.
 */
function isAuthorized(
  req: IncomingMessage,
  tokens: readonly string[],
  options: { allowQueryToken: boolean; allowOpenAISubprotocolKey: boolean },
): boolean {
  if (tokens.length === 0) {
    return true;
  }
  const header = req.headers.authorization;
  const headerToken =
    typeof header === "string" && header.startsWith("Bearer ")
      ? header.slice(7)
      : undefined;
  let urlToken: string | undefined;
  if (options.allowQueryToken) {
    try {
      urlToken =
        new URL(req.url ?? "/", "http://localhost").searchParams.get("token") ??
        undefined;
    } catch {
      urlToken = undefined;
    }
  }
  const protocols = offeredProtocols(req);
  const protocolToken =
    protocols
      .find((p) => p.startsWith(SUBPROTOCOL_KEY_PREFIX))
      ?.slice(SUBPROTOCOL_KEY_PREFIX.length) ??
    (options.allowOpenAISubprotocolKey
      ? protocols
          .find((p) => p.startsWith(OPENAI_SUBPROTOCOL_KEY_PREFIX))
          ?.slice(OPENAI_SUBPROTOCOL_KEY_PREFIX.length)
      : undefined);
  const provided = headerToken ?? protocolToken ?? urlToken;
  return (
    provided !== undefined &&
    tokens.some((t) => timingSafeEqualString(provided, t))
  );
}

/** `true` when the upgrade's URL carries a `?token=`, whether or not it is honoured. */
function carriesQueryToken(req: IncomingMessage): boolean {
  try {
    return new URL(req.url ?? "/", "http://localhost").searchParams.has(
      "token",
    );
  } catch {
    return false;
  }
}

function pathOf(req: IncomingMessage): string {
  try {
    return new URL(req.url ?? "/", "http://localhost").pathname;
  } catch {
    return "";
  }
}

/** A query parameter of the upgrade URL, trimmed and length-capped; `undefined` when absent. */
function queryParam(req: IncomingMessage, name: string): string | undefined {
  try {
    const value = new URL(req.url ?? "/", "http://localhost").searchParams
      .get(name)
      ?.trim();
    return value ? value.slice(0, 100) : undefined;
  } catch {
    return undefined;
  }
}

function parseJson(frame: Buffer): unknown {
  try {
    return JSON.parse(frame.toString("utf-8"));
  } catch {
    return undefined;
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
  const subscribePath =
    options.subscribePath === false
      ? undefined
      : (options.subscribePath ?? `${path}/subscribe`);
  const realtimePath =
    options.realtimePath === false
      ? undefined
      : (options.realtimePath ?? DEFAULT_REALTIME_PATH);
  const realtimeProfiles = resolveRealtimeProfiles(options.realtimeProfiles);
  const tokens = configuredTokens(options.authToken);
  const allowQueryToken = options.allowQueryToken === true;
  const maxConnections = options.maxConnections ?? DEFAULT_MAX_CONNECTIONS;
  const maxPerAddress =
    options.maxConnectionsPerAddress ?? DEFAULT_MAX_CONNECTIONS_PER_ADDRESS;
  const highWaterMark = options.highWaterMark ?? DEFAULT_HIGH_WATER_MARK;
  const maxTotalQueued =
    options.maxTotalQueuedBytes ?? DEFAULT_MAX_TOTAL_QUEUED_BYTES;
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: options.maxPayload ?? 1_048_576,
    // OpenAI's browser SDK offers "realtime" alongside its key subprotocol;
    // a browser on the stream path offers "neurolink" alongside
    // "neurolink-api-key.<key>". The key-bearing protocol is never selected.
    handleProtocols: (protocols: Set<string>) =>
      protocols.has("realtime")
        ? "realtime"
        : protocols.has("neurolink")
          ? "neurolink"
          : false,
  });

  // Sessions by id, alive while a speaker or a listener holds them. A session
  // whose first speaker set `?secret=` admits only joins that present it.
  const sessions = new Map<
    string,
    { session: TranscriptionSession; refs: number; secret: string | undefined }
  >();
  /**
   * Join `id` with `secret`, or the reason a join is refused: a session with a
   * secret and a join without the same one, or (with `requireSessionSecret`) a
   * new session that sets none.
   */
  const admit = (
    id: string,
    secret: string | undefined,
  ): TranscriptionSession | "secret-mismatch" | "secret-required" => {
    const existing = sessions.get(id);
    if (existing) {
      if (
        existing.secret !== undefined &&
        (secret === undefined ||
          !timingSafeEqualString(secret, existing.secret))
      ) {
        return "secret-mismatch";
      }
      existing.refs++;
      return existing.session;
    }
    if (options.requireSessionSecret && !secret) {
      return "secret-required";
    }
    const entry = {
      session: new TranscriptionSession(neurolink, { id }),
      refs: 1,
      secret,
    };
    sessions.set(id, entry);
    return entry.session;
  };
  const release = (id: string): void => {
    const entry = sessions.get(id);
    if (!entry) {
      return;
    }
    entry.refs--;
    if (entry.refs <= 0) {
      entry.session.close();
      sessions.delete(id);
    }
  };
  const sessionRefusal = (
    verdict: "secret-mismatch" | "secret-required",
  ): string =>
    verdict === "secret-mismatch"
      ? "This session requires its secret (?secret=)"
      : "A new session must set ?secret=<value> on this server";

  // Open sockets, in all and per remote address, counted from the upgrade so
  // a flood of handshakes is refused before any engine is started. The raw
  // socket's close releases the count whether or not the handshake completed.
  let openConnections = 0;
  const perAddress = new Map<string, number>();
  const serverIsLoopback = (): boolean => {
    const address = server.address();
    return (
      typeof address === "object" &&
      address !== null &&
      isLoopbackAddress(address.address)
    );
  };

  const onUpgrade = (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    const requested = pathOf(req);
    if (
      requested !== path &&
      requested !== subscribePath &&
      requested !== realtimePath
    ) {
      return; // Someone else's upgrade.
    }
    if (!isOriginAllowed(req, options.allowedOrigins)) {
      refuseUpgrade(socket, 403, "Forbidden");
      return;
    }
    if (
      !isAuthorized(req, tokens, {
        allowQueryToken,
        allowOpenAISubprotocolKey: requested === realtimePath,
      })
    ) {
      if (tokens.length > 0 && !allowQueryToken && carriesQueryToken(req)) {
        logger.warn(
          "[TranscribeWebSocket] refused an upgrade that carried the key in ?token= (allowQueryToken is off)",
        );
      }
      refuseUpgrade(socket, 401, "Unauthorized");
      return;
    }
    const peer = canonicalAddress(req.socket.remoteAddress ?? "") ?? "unknown";
    const fromPeer = perAddress.get(peer) ?? 0;
    if (openConnections >= maxConnections || fromPeer >= maxPerAddress) {
      logger.warn("[TranscribeWebSocket] refused an upgrade: connection cap", {
        open: openConnections,
        fromPeer,
      });
      refuseUpgrade(socket, 503, "Service Unavailable");
      return;
    }
    openConnections++;
    perAddress.set(peer, fromPeer + 1);
    let released = false;
    socket.once("close", () => {
      if (released) {
        return;
      }
      released = true;
      openConnections--;
      const left = (perAddress.get(peer) ?? 1) - 1;
      if (left <= 0) {
        perAddress.delete(peer);
      } else {
        perAddress.set(peer, left);
      }
    });
    wss.handleUpgrade(req, socket, head, (client) => {
      wss.emit("connection", client, req);
    });
  };
  server.on("upgrade", onUpgrade);

  /** A listener: subscribe frames in, the session's events (filtered) out. */
  const onListener = (
    client: InstanceType<typeof WebSocket>,
    req: IncomingMessage,
  ): void => {
    const id = queryParam(req, "session");
    if (!id) {
      client.send(
        JSON.stringify({
          type: "error",
          message: "A listener needs ?session=<id>",
          recoverable: false,
        }),
      );
      client.close(1008, "session required");
      return;
    }
    const admitted = admit(id, queryParam(req, "secret"));
    if (typeof admitted === "string") {
      client.send(
        JSON.stringify({
          type: "error",
          message: sessionRefusal(admitted),
          recoverable: false,
        }),
      );
      client.close(1008, "session refused");
      return;
    }
    const session = admitted;
    let subscription: TranscriptionSubscription | undefined;
    const deliver = (event: TranscriptionSessionEvent): void => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(event));
      }
    };
    client.on("message", (data: Buffer | ArrayBuffer | Buffer[]) => {
      const frame = Buffer.isBuffer(data)
        ? data
        : Array.isArray(data)
          ? Buffer.concat(data)
          : Buffer.from(data);
      const parsed = TranscribeSubscribeSchema.safeParse(parseJson(frame));
      if (!parsed.success) {
        client.send(
          JSON.stringify({
            type: "error",
            message:
              'Expected {"type":"subscribe","languages":[…],"speakers":[…]}',
            recoverable: true,
          }),
        );
        return;
      }
      if (subscription) {
        subscription.update({
          ...(parsed.data.languages
            ? { languages: parsed.data.languages }
            : {}),
          ...(parsed.data.speakers ? { speakers: parsed.data.speakers } : {}),
        });
        return;
      }
      subscription = session.subscribe(parsed.data, deliver);
    });
    let released = false;
    const leave = (): void => {
      if (released) {
        return;
      }
      released = true;
      subscription?.close();
      release(id);
    };
    client.on("close", leave);
    client.on("error", leave);
  };

  wss.on(
    "connection",
    (client: InstanceType<typeof WebSocket>, req: IncomingMessage) => {
      if (subscribePath && pathOf(req) === subscribePath) {
        onListener(client, req);
        return;
      }
      if (realtimePath && pathOf(req) === realtimePath) {
        serveRealtimeTranscription(client, req, neurolink, realtimeProfiles);
        return;
      }
      const queue = new FrameQueue();
      let started = false;
      let fileMode = false;
      // Backpressure: above the high-water mark the socket stops reading until
      // the engine has taken enough of the backlog (half the mark), so a fast
      // sender is slowed by TCP instead of buffered without bound.
      let paused = false;
      queue.setLevelListener((level) => {
        if (!paused && level > highWaterMark) {
          paused = true;
          client.pause();
        } else if (paused && level <= highWaterMark / 2) {
          paused = false;
          client.resume();
        }
      });
      // Debugging: `NEUROLINK_STT_RECORD_DIR` keeps every session's config,
      // audio (PCM16LE) and events on disk, so a live session can be replayed
      // and compared against another engine. Off unless set.
      const recordRoot = process.env.NEUROLINK_STT_RECORD_DIR?.trim();
      const recordDir = recordRoot
        ? join(
            recordRoot,
            `${new Date().toISOString().replace(/[:.]/g, "-")}-${Math.random().toString(36).slice(2, 6)}`,
          )
        : undefined;
      const record = (
        name: string,
        data: string | Buffer,
        append = true,
      ): void => {
        if (!recordDir) {
          return;
        }
        try {
          mkdirSync(recordDir, { recursive: true });
          (append ? appendFileSync : writeFileSync)(
            join(recordDir, name),
            data,
          );
        } catch {
          // Recording is best effort; it never affects the session.
        }
      };
      // Output languages, changeable mid-stream by control frames.
      let liveLanguages: readonly string[] = [];
      const sessionId = subscribePath ? queryParam(req, "session") : undefined;
      const sessionSecret = queryParam(req, "secret");
      // No name: the session assigns a unique one (speaker-1, speaker-2, …).
      const speaker = queryParam(req, "speaker") ?? "";

      const send = (event: TranscribeStreamEvent): boolean => {
        record(
          "events.jsonl",
          `${JSON.stringify({ at: Date.now(), ...event })}\n`,
        );
        if (client.readyState !== WebSocket.OPEN) {
          return false;
        }
        client.send(JSON.stringify(event));
        return true;
      };

      const events = (
        config: Omit<TranscribeStreamOptions, "audio">,
      ): AsyncIterable<TranscribeStreamEvent> => {
        const options: TranscribeStreamOptions = {
          ...config,
          audio: queue,
          output: {
            ...config.output,
            languages: { current: () => liveLanguages },
          },
        };
        if (!sessionId) {
          return neurolink.transcribeStream(options);
        }
        // A session speaker: events go to the session's listeners and back to
        // this socket. The session is held until this speaker's audio ends.
        const admitted = admit(sessionId, sessionSecret);
        if (typeof admitted === "string") {
          const refusal = new Error(sessionRefusal(admitted));
          return {
            [Symbol.asyncIterator]: () => ({
              next: () => Promise.reject(refusal),
            }),
          };
        }
        const session = admitted;
        const buffered: TranscriptionSessionEvent[] = [];
        let wake: (() => void) | undefined;
        let finished = false;
        let failure: unknown;
        void session
          .addSpeaker(speaker, options, (event) => {
            buffered.push(event);
            wake?.();
          })
          .catch((error: unknown) => {
            failure = error;
          })
          .finally(() => {
            finished = true;
            release(sessionId);
            wake?.();
          });
        return {
          [Symbol.asyncIterator]: async function* () {
            for (;;) {
              const next = buffered.shift();
              if (next) {
                yield next;
                continue;
              }
              if (finished) {
                if (failure) {
                  throw failure;
                }
                return;
              }
              await new Promise<void>((resolve) => {
                wake = resolve;
              });
              wake = undefined;
            }
          },
        };
      };

      const run = async (config: Omit<TranscribeStreamOptions, "audio">) => {
        try {
          for await (const event of events(config)) {
            if (!send(event)) {
              break; // The client is gone; stop pulling.
            }
          }
          if (client.readyState === WebSocket.OPEN) {
            client.close(1000, "done");
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          logger.warn("[TranscribeWebSocket] stream failed", {
            error: message,
          });
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
            const { mode, ...rest } = config.data;
            fileMode = mode === "file";
            // File mode buffers a whole recording (up to 512 MiB) for a
            // caller; on a listener the network can reach, only a caller the
            // server authenticated gets that, unless the operator opts out.
            if (
              fileMode &&
              tokens.length === 0 &&
              options.allowUnauthenticatedFileMode !== true &&
              !serverIsLoopback()
            ) {
              send({
                type: "error",
                message:
                  'mode "file" needs authentication on this server; stream live audio instead',
                recoverable: false,
              });
              client.close(1008, "file mode requires authentication");
              return;
            }
            liveLanguages = rest.output?.languages ?? [];
            record("config.json", JSON.stringify(config.data, null, 1), false);
            void run(fileMode ? fileModeStreamOptions(rest) : rest);
            return;
          }
          if (isBinary) {
            // The process-wide budget is checked before the frame is taken:
            // one socket's burst must not take the others down with it.
            if (totalQueuedFrameBytes() + frame.length > maxTotalQueued) {
              send({
                type: "error",
                message:
                  "The server is holding too much audio right now; try again later",
                recoverable: false,
              });
              queue.end();
              client.close(1013, "server busy");
              return;
            }
            record("audio.pcm", frame);
            queue.push(frame);
            if (
              queue.queuedBytes >
              (fileMode ? MAX_QUEUED_BYTES_FILE : MAX_QUEUED_BYTES)
            ) {
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
          // `output` changes the languages; any other text frame ends the
          // audio ({"type":"end"}).
          const control = TranscribeOutputControlSchema.safeParse(
            parseJson(frame),
          );
          if (control.success) {
            liveLanguages = control.data.languages;
            return;
          }
          queue.end();
        },
      );

      client.on("close", () => queue.end());
      client.on("error", () => queue.end());
    },
  );

  return {
    close: () => {
      server.off("upgrade", onUpgrade);
      for (const client of wss.clients) {
        client.terminate();
      }
      for (const { session } of sessions.values()) {
        session.close();
      }
      sessions.clear();
      wss.close();
    },
  };
}
