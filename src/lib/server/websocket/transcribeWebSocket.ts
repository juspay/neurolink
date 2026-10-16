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
 * languages. A session lives while a speaker or a listener is connected.
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
import {
  TranscribeOutputControlSchema,
  TranscribeStreamConfigSchema,
  TranscribeSubscribeSchema,
} from "../utils/validation.js";
import { fileModeStreamOptions } from "../../voice/transcribe.js";
import { TranscriptionSession } from "../../voice/session/transcriptionSession.js";
import { FrameQueue } from "./frameQueue.js";
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
  allowSubprotocolKey = false,
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
  // OpenAI's browser SDK cannot set headers, so it sends the key as the
  // subprotocol "openai-insecure-api-key.<key>"; honoured on the realtime path.
  const protocolToken = allowSubprotocolKey
    ? String(req.headers["sec-websocket-protocol"] ?? "")
        .split(",")
        .map((p) => p.trim())
        .find((p) => p.startsWith("openai-insecure-api-key."))
        ?.slice("openai-insecure-api-key.".length)
    : undefined;
  const provided = headerToken ?? urlToken ?? protocolToken;
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
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: options.maxPayload ?? 1_048_576,
    // OpenAI's browser SDK offers "realtime" alongside its key subprotocol.
    handleProtocols: (protocols: Set<string>) =>
      protocols.has("realtime") ? "realtime" : false,
  });

  // Sessions by id, alive while a speaker or a listener holds them.
  const sessions = new Map<
    string,
    { session: TranscriptionSession; refs: number }
  >();
  const acquire = (id: string): TranscriptionSession => {
    const entry = sessions.get(id) ?? {
      session: new TranscriptionSession(neurolink, { id }),
      refs: 0,
    };
    entry.refs++;
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
      socket.write("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }
    if (!isAuthorized(req, options.authToken, requested === realtimePath)) {
      socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }
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
    const session = acquire(id);
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
        const session = acquire(sessionId);
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
            liveLanguages = rest.output?.languages ?? [];
            record("config.json", JSON.stringify(config.data, null, 1), false);
            void run(fileMode ? fileModeStreamOptions(rest) : rest);
            return;
          }
          if (isBinary) {
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
