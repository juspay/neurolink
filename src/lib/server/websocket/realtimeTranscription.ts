/**
 * OpenAI Realtime transcription protocol over `transcribeStream()`.
 *
 * A client connects to `/v1/realtime?intent=transcription` and speaks OpenAI's
 * Realtime transcription protocol, so the stock LiveKit
 * `openai.STT(base_url=…, use_realtime=True)` plugin, Pipecat or the OpenAI
 * SDK stream to NeuroLink with no adapter:
 *
 * - config: `session.update` (`session.type: "transcription"`, audio under
 *   `session.audio.input`) or the beta `transcription_session.update`;
 * - audio: `input_audio_buffer.append` with base64 PCM16 at the declared rate
 *   (24 kHz for both dialects' default);
 * - `input_audio_buffer.commit` closes the open utterance; so does an audio
 *   gap, since a client that stops sending (a muted mic) sends nothing else.
 *
 * Each utterance is one conversation item. Its events go out in this order:
 * - `input_audio_buffer.speech_started`;
 * - `…input_audio_transcription.delta` per newly agreed words. A client
 *   appends deltas, so only the prefix two passes agreed on is sent; words
 *   still in flux never reach it;
 * - `input_audio_buffer.speech_stopped`, `input_audio_buffer.committed`;
 * - `…input_audio_transcription.completed` with the corrected text (or the
 *   raw final; see `ServerSTTRealtimeProfile.completed`).
 *
 * Items complete strictly in order: a client keeps one running text, so a
 * later utterance's deltas wait until the earlier one has completed.
 * NeuroLink's own detail goes out as extra event types a stock client ignores:
 * `neurolink.final`, `neurolink.corrected` and `neurolink.output`.
 *
 * Everything NeuroLink-specific (engine, fallback, dictionary, correction,
 * output languages) comes from the profile the client's `model` names; a
 * realtime client cannot send it.
 *
 * @module server/websocket/realtimeTranscription
 */

import { randomUUID } from "node:crypto";
import type { IncomingMessage } from "node:http";
import type { NeuroLink } from "../../neurolink.js";
import type {
  ServerRealtimeItem,
  ServerRealtimeSessionConfig,
  ServerRealtimeSocket,
  ServerSTTRealtimeProfile,
  TranscribeStreamEvent,
  TranscribeStreamOptions,
} from "../../types/index.js";
import {
  listConfiguredSTTProviders,
  resolveSTTEndpoints,
} from "../../factories/sttDescriptors.js";
import { STTProcessor } from "../../utils/sttProcessor.js";
import { logger } from "../../utils/logger.js";
import { isCorrectionEnabled } from "../../voice/correction/index.js";
import { STTRealtimeProfilesSchema } from "../utils/validation.js";
import { FrameQueue } from "./frameQueue.js";

const OPEN = 1;
const DEFAULT_RATE = 24_000;
const DEFAULT_CORRECTION_WAIT_MS = 3000;
/** Audio waiting for the engine beyond this (about 5.8 min at 24 kHz) closes the socket. */
const MAX_QUEUED_BYTES = 16 * 1024 * 1024;
/** No audio for this long while speech may be open: the client stopped sending. */
const IDLE_FLUSH_MS = 700;
/** Silence pushed to close an utterance (more than the endpointer's 750 ms closing pause). */
const FLUSH_SILENCE_MS = 1200;
/** Shortest closing pause a client's `silence_duration_ms` may set. */
const MIN_CLIENT_SILENCE_MS = 300;

/**
 * Operator profiles: `NEUROLINK_STT_REALTIME_PROFILES` (JSON), overlaid by
 * the attach option. An invalid env value is logged and ignored.
 */
export function resolveRealtimeProfiles(
  fromOptions: Readonly<Record<string, ServerSTTRealtimeProfile>> = {},
  env: NodeJS.ProcessEnv = process.env,
): Readonly<Record<string, ServerSTTRealtimeProfile>> {
  const raw = env.NEUROLINK_STT_REALTIME_PROFILES?.trim();
  let fromEnv: Record<string, ServerSTTRealtimeProfile> = {};
  if (raw) {
    try {
      const parsed = STTRealtimeProfilesSchema.safeParse(JSON.parse(raw));
      if (parsed.success) {
        fromEnv = parsed.data;
      } else {
        logger.warn(
          "[RealtimeTranscription] NEUROLINK_STT_REALTIME_PROFILES is invalid and was ignored",
          { issues: parsed.error.issues.map((i) => i.path.join(".")) },
        );
      }
    } catch {
      logger.warn(
        "[RealtimeTranscription] NEUROLINK_STT_REALTIME_PROFILES is not JSON and was ignored",
      );
    }
  }
  return { ...fromEnv, ...fromOptions };
}

/** The profile a client's `model` selects. */
function profileFor(
  model: string | undefined,
  profiles: Readonly<Record<string, ServerSTTRealtimeProfile>>,
): ServerSTTRealtimeProfile {
  if (model && Object.hasOwn(profiles, model)) {
    return profiles[model];
  }
  if (model) {
    const providers = new Set([
      ...listConfiguredSTTProviders(),
      ...STTProcessor.listProviders(),
      ...Object.keys(resolveSTTEndpoints()),
    ]);
    if (providers.has(model)) {
      return { ...(profiles.default ?? {}), provider: model };
    }
  }
  return profiles.default ?? {};
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/**
 * The session a client asked for, in either dialect, or the reason it cannot
 * be served. Only PCM16 is accepted.
 */
function readSession(
  type: string,
  session: Record<string, unknown>,
): ServerRealtimeSessionConfig | { error: string } {
  if (type === "session.update") {
    if (session.type !== undefined && session.type !== "transcription") {
      return { error: 'Only session.type "transcription" is served here' };
    }
    const input = asRecord(asRecord(session.audio)?.input) ?? {};
    const format = asRecord(input.format) ?? {};
    if (format.type !== undefined && format.type !== "audio/pcm") {
      return { error: 'Only audio format "audio/pcm" (PCM16) is supported' };
    }
    const rate = typeof format.rate === "number" ? format.rate : DEFAULT_RATE;
    const transcription = asRecord(input.transcription) ?? {};
    const turn = asRecord(input.turn_detection) ?? {};
    return {
      dialect: "ga",
      rate,
      model: asString(transcription.model),
      language: asString(transcription.language),
      prompt: asString(transcription.prompt),
      silenceMs:
        typeof turn.silence_duration_ms === "number"
          ? turn.silence_duration_ms
          : undefined,
    };
  }
  if (
    session.input_audio_format !== undefined &&
    session.input_audio_format !== "pcm16"
  ) {
    return { error: 'Only input_audio_format "pcm16" is supported' };
  }
  const transcription = asRecord(session.input_audio_transcription) ?? {};
  const turn = asRecord(session.turn_detection) ?? {};
  return {
    dialect: "beta",
    rate: DEFAULT_RATE,
    model: asString(transcription.model),
    language: asString(transcription.language),
    prompt: asString(transcription.prompt),
    silenceMs:
      typeof turn.silence_duration_ms === "number"
        ? turn.silence_duration_ms
        : undefined,
  };
}

/** The session object echoed in `session.created` / `…updated`. */
function sessionObject(
  id: string,
  config: ServerRealtimeSessionConfig | undefined,
): Record<string, unknown> {
  const transcription = {
    model: config?.model ?? null,
    language: config?.language ?? null,
    prompt: config?.prompt ?? null,
  };
  if (config?.dialect === "beta") {
    return {
      id,
      object: "realtime.transcription_session",
      input_audio_format: "pcm16",
      input_audio_transcription: transcription,
    };
  }
  return {
    id,
    object: "realtime.transcription_session",
    type: "transcription",
    audio: {
      input: {
        format: { type: "audio/pcm", rate: config?.rate ?? DEFAULT_RATE },
        transcription,
      },
    },
  };
}

/**
 * Serve one realtime transcription connection. The upgrade has already
 * passed the origin and token checks.
 */
export function serveRealtimeTranscription(
  client: ServerRealtimeSocket,
  req: IncomingMessage,
  neurolink: NeuroLink,
  profiles: Readonly<Record<string, ServerSTTRealtimeProfile>>,
): void {
  const connection = randomUUID().replace(/-/gu, "").slice(0, 16);
  const sessionId = `sess_${connection}`;
  let eventSeq = 0;
  const send = (type: string, body: Record<string, unknown> = {}): void => {
    if (client.readyState !== OPEN) {
      return;
    }
    eventSeq++;
    client.send(
      JSON.stringify({
        event_id: `event_${connection}_${eventSeq}`,
        type,
        ...body,
      }),
    );
  };
  const fail = (message: string, code: string, close = false): void => {
    send("error", {
      error: { type: "invalid_request_error", code, message, param: null },
    });
    if (close && client.readyState === OPEN) {
      client.close(1008, code);
    }
  };

  const intent = (() => {
    try {
      return new URL(req.url ?? "/", "http://localhost").searchParams.get(
        "intent",
      );
    } catch {
      return null;
    }
  })();
  if (intent !== "transcription") {
    fail(
      "Only ?intent=transcription is served on this path",
      "unsupported_intent",
      true,
    );
    return;
  }

  const queue = new FrameQueue();
  let config: ServerRealtimeSessionConfig | undefined;
  let started = false;
  let receivedSamples = 0;
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  let flushedSinceAudio = true;

  const items = new Map<number, ServerRealtimeItem>();
  /** Utterances in order; the first is the only one whose events go out. */
  const order: number[] = [];
  let previousItemId: string | null = null;
  /** Utterances already completed; a late event for one must not reopen it. */
  const finished = new Set<number>();

  const itemFor = (utterance: number): ServerRealtimeItem => {
    const held = items.get(utterance);
    if (held) {
      return held;
    }
    const item: ServerRealtimeItem = {
      utterance,
      itemId: `item_${connection}_${utterance}`,
      started: false,
      sent: "",
      pending: [],
      corrected: false,
      done: finished.has(utterance),
    };
    if (item.done) {
      return item;
    }
    items.set(utterance, item);
    order.push(utterance);
    order.sort((a, b) => a - b);
    return item;
  };
  const isHead = (item: ServerRealtimeItem): boolean =>
    order[0] === item.utterance;
  const emit = (
    item: ServerRealtimeItem,
    type: string,
    body: Record<string, unknown>,
  ): void => {
    if (item.done || isHead(item)) {
      send(type, body);
    } else {
      item.pending.push({ type, body });
    }
  };
  /** Completes the head while it is ready, then lets the next one speak. */
  const drain = (): void => {
    for (;;) {
      const head = order[0] === undefined ? undefined : items.get(order[0]);
      if (!head || head.ready === undefined) {
        return;
      }
      if (head.timer) {
        clearTimeout(head.timer);
      }
      if (head.started) {
        send("conversation.item.input_audio_transcription.completed", {
          item_id: head.itemId,
          content_index: 0,
          transcript: head.ready,
          neurolink: {
            engine: head.engine ?? null,
            language: head.language ?? null,
            language_detected: head.languageDetected ?? null,
            corrected: head.corrected,
          },
        });
      }
      head.done = true;
      finished.add(head.utterance);
      order.shift();
      items.delete(head.utterance);
      const next = order[0] === undefined ? undefined : items.get(order[0]);
      if (next) {
        for (const event of next.pending.splice(0)) {
          send(event.type, event.body);
        }
      }
    }
  };
  const settle = (item: ServerRealtimeItem, transcript: string): void => {
    if (item.ready !== undefined) {
      return;
    }
    item.ready = transcript;
    drain();
  };
  const startItem = (item: ServerRealtimeItem, startSeconds: number): void => {
    if (item.started) {
      return;
    }
    item.started = true;
    emit(item, "input_audio_buffer.speech_started", {
      audio_start_ms: Math.max(0, Math.round(startSeconds * 1000)),
      item_id: item.itemId,
    });
  };
  const receivedSeconds = (): number =>
    receivedSamples / (config?.rate ?? DEFAULT_RATE);

  const flushUtterance = (): void => {
    if (flushedSinceAudio || !started) {
      return;
    }
    flushedSinceAudio = true;
    const rate = config?.rate ?? DEFAULT_RATE;
    queue.push(Buffer.alloc(Math.round((rate * FLUSH_SILENCE_MS) / 1000) * 2));
  };

  const run = async (
    options: TranscribeStreamOptions,
    profile: ServerSTTRealtimeProfile,
  ) => {
    const completedMode = profile.completed ?? "corrected";
    const waitMs = profile.correctionWaitMs ?? DEFAULT_CORRECTION_WAIT_MS;
    // The stream's own rule: without it no `corrected` event ever comes.
    const correcting =
      completedMode === "corrected" &&
      isCorrectionEnabled(options.dictionary, options.correction);
    try {
      for await (const event of neurolink.transcribeStream(options)) {
        handle(event, correcting, waitMs);
      }
      // The stream is over: whatever still waits for a correction goes now.
      for (const utterance of [...order]) {
        const item = items.get(utterance);
        if (item) {
          settle(item, item.finalText ?? "");
        }
      }
      if (client.readyState === OPEN) {
        client.close(1000, "done");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn("[RealtimeTranscription] stream failed", { error: message });
      send("error", {
        error: {
          type: "server_error",
          code: "stream_failed",
          message,
          param: null,
        },
      });
      if (client.readyState === OPEN) {
        client.close(1011, "transcription failed");
      }
    }
  };

  const handle = (
    event: TranscribeStreamEvent,
    correcting: boolean,
    waitMs: number,
  ): void => {
    switch (event.type) {
      case "interim": {
        const item = itemFor(event.utterance);
        if (item.done) {
          return;
        }
        startItem(item, receivedSeconds() - event.seconds);
        const committed = event.committed;
        if (
          committed.length > item.sent.length &&
          committed.startsWith(item.sent)
        ) {
          let delta = committed.slice(item.sent.length);
          if (item.sent && !/\s$/u.test(item.sent) && !/^\s/u.test(delta)) {
            delta = ` ${delta}`;
          }
          item.sent = committed;
          emit(item, "conversation.item.input_audio_transcription.delta", {
            item_id: item.itemId,
            content_index: 0,
            delta,
          });
        }
        return;
      }
      case "final": {
        const item = itemFor(event.utterance);
        if (item.done) {
          return;
        }
        const start = event.segment.start ?? event.segment.startTime;
        const end = event.segment.end ?? event.segment.endTime;
        startItem(item, start ?? receivedSeconds());
        item.finalText = event.text;
        item.engine = event.engine;
        item.language = event.language;
        item.languageDetected = event.languageDetected;
        emit(item, "input_audio_buffer.speech_stopped", {
          audio_end_ms: Math.round((end ?? receivedSeconds()) * 1000),
          item_id: item.itemId,
        });
        emit(item, "input_audio_buffer.committed", {
          item_id: item.itemId,
          previous_item_id: previousItemId,
        });
        previousItemId = item.itemId;
        emit(item, "neurolink.final", {
          item_id: item.itemId,
          text: event.text,
          engine: event.engine,
          language: event.language ?? null,
          language_detected: event.languageDetected ?? null,
        });
        if (!correcting) {
          settle(item, event.text);
          return;
        }
        item.timer = setTimeout(
          () => settle(item, item.finalText ?? ""),
          waitMs,
        );
        return;
      }
      case "corrected": {
        const item = items.get(event.utterance);
        if (!item) {
          send("neurolink.corrected", {
            item_id: `item_${connection}_${event.utterance}`,
            text: event.text,
          });
          return;
        }
        emit(item, "neurolink.corrected", {
          item_id: item.itemId,
          text: event.text,
        });
        item.corrected = event.text.trim().length > 0;
        settle(item, item.corrected ? event.text : (item.finalText ?? ""));
        return;
      }
      case "silence": {
        const item = items.get(event.utterance);
        if (!item) {
          return;
        }
        if (item.started) {
          emit(item, "input_audio_buffer.speech_stopped", {
            audio_end_ms: Math.round(receivedSeconds() * 1000),
            item_id: item.itemId,
          });
        }
        // An empty completed clears the client's interim text.
        settle(item, "");
        return;
      }
      case "output": {
        const body = {
          item_id: `item_${connection}_${event.utterance}`,
          language: event.language,
          text: event.text,
          status: event.status,
        };
        const item = items.get(event.utterance);
        if (item) {
          emit(item, "neurolink.output", body);
        } else {
          send("neurolink.output", body);
        }
        return;
      }
      case "error": {
        send("error", {
          error: {
            type: "server_error",
            code: event.recoverable ? "utterance_failed" : "stream_failed",
            message: event.message,
            param: null,
          },
        });
        return;
      }
      default:
        return;
    }
  };

  const start = (): void => {
    if (started) {
      return;
    }
    started = true;
    const session = config ?? { dialect: "ga", rate: DEFAULT_RATE };
    const profile = profileFor(session.model, profiles);
    const {
      completed: _completed,
      correctionWaitMs: _wait,
      clientLanguage,
      clientTurnDetection,
      ...stream
    } = profile;
    const options: TranscribeStreamOptions = {
      ...(stream as Omit<TranscribeStreamOptions, "audio">),
      audio: queue,
      streaming: {
        ...stream.streaming,
        sampleRate: session.rate,
        ...(clientTurnDetection && session.silenceMs !== undefined
          ? {
              endSilenceMs: Math.max(MIN_CLIENT_SILENCE_MS, session.silenceMs),
            }
          : {}),
      },
      ...(clientLanguage !== false && session.language && !stream.language
        ? { language: session.language }
        : {}),
      // The client's prompt is context for the correction, not text for the
      // engine: an engine prompted with it can echo it into the transcript.
      // Only where the profile corrects at all: a prompt must not switch
      // correction on by itself.
      ...(session.prompt &&
      stream.correction &&
      !stream.correction.context &&
      isCorrectionEnabled(stream.dictionary, stream.correction)
        ? { correction: { ...stream.correction, context: session.prompt } }
        : {}),
    };
    void run(options, profile);
  };

  client.on(
    "message",
    (data: Buffer | ArrayBuffer | Buffer[], isBinary: boolean) => {
      if (isBinary) {
        fail(
          "Send audio as input_audio_buffer.append events with base64 PCM16",
          "binary_not_supported",
        );
        return;
      }
      const frame = Buffer.isBuffer(data)
        ? data
        : Array.isArray(data)
          ? Buffer.concat(data)
          : Buffer.from(data);
      let message: Record<string, unknown> | undefined;
      try {
        message = asRecord(JSON.parse(frame.toString("utf-8")));
      } catch {
        message = undefined;
      }
      const type = typeof message?.type === "string" ? message.type : undefined;
      if (!message || !type) {
        fail("Each frame must be a JSON event with a type", "invalid_event");
        return;
      }
      switch (type) {
        case "session.update":
        case "transcription_session.update": {
          const read = readSession(type, asRecord(message.session) ?? {});
          if ("error" in read) {
            fail(read.error, "unsupported_session", !started);
            return;
          }
          if (!started) {
            config = read;
          }
          // A running stream keeps the settings it started with.
          send(
            type === "session.update"
              ? "session.updated"
              : "transcription_session.updated",
            { session: sessionObject(sessionId, config ?? read) },
          );
          return;
        }
        case "input_audio_buffer.append": {
          const audio = typeof message.audio === "string" ? message.audio : "";
          const pcm = Buffer.from(audio, "base64");
          if (pcm.length === 0) {
            return;
          }
          start();
          queue.push(pcm);
          receivedSamples += Math.floor(pcm.length / 2);
          flushedSinceAudio = false;
          if (idleTimer) {
            clearTimeout(idleTimer);
          }
          idleTimer = setTimeout(flushUtterance, IDLE_FLUSH_MS);
          if (queue.queuedBytes > MAX_QUEUED_BYTES) {
            send("error", {
              error: {
                type: "server_error",
                code: "backlog",
                message: "Audio is arriving faster than it can be transcribed",
                param: null,
              },
            });
            queue.end();
            client.close(1009, "backlog");
          }
          return;
        }
        case "input_audio_buffer.commit":
          flushUtterance();
          return;
        case "input_audio_buffer.clear":
          send("input_audio_buffer.cleared");
          return;
        default:
          fail(`Unsupported event type "${type}"`, "unsupported_event");
      }
    },
  );

  const end = (): void => {
    if (idleTimer) {
      clearTimeout(idleTimer);
    }
    for (const item of items.values()) {
      if (item.timer) {
        clearTimeout(item.timer);
      }
    }
    queue.end();
  };
  client.on("close", end);
  client.on("error", end);

  send("session.created", { session: sessionObject(sessionId, undefined) });
}
