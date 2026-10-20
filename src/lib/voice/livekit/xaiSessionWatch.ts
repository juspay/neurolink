/**
 * What this package adds around an xAI realtime session.
 *
 * The LiveKit xAI plugin is the OpenAI realtime plugin pointed at xAI, and the
 * live service differs from OpenAI in three ways the plugin does not cover
 * (measured 2026-10-20, see docs/features/livekit-voice-agent.md):
 *
 *  - xAI sends usage at the top level of `response.done` and leaves
 *    `response.usage` an empty object, which is what the plugin reads, so its
 *    metrics are zero for every response;
 *  - an unknown model id is accepted and runs a default model, with no error;
 *  - a wrong key is refused with HTTP 400 at the WebSocket upgrade, and the
 *    plugin opens its socket without an 'error' listener, so the refusal is an
 *    uncaught exception.
 *
 * `observeXaiSession` reads the stream of server events the plugin republishes
 * as `openai_server_event_received` for the first two, and watches for the
 * third.
 */

import { logger } from "../../utils/logger.js";
import type {
  XaiObservedSession,
  XaiResponseUsage,
} from "../../types/index.js";

const TOKEN_COUNT_KEYS = ["input_tokens", "output_tokens"] as const;
const REFUSED_UPGRADE = /^Unexpected server response: (\d{3})$/;
const KEY_REFUSAL_STATUSES: ReadonlySet<number> = new Set([400, 401, 403]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function countOf(source: Record<string, unknown>, key: string): number {
  const value = source[key];
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : 0;
}

function detailOf(
  source: Record<string, unknown>,
  group: string,
  key: string,
): number {
  const details = source[group];
  return isRecord(details) ? countOf(details, key) : 0;
}

/**
 * The token counts of a `response.done` event, or `undefined` when it reports
 * none. xAI's own place is the top level of the event; `response.usage`, where
 * OpenAI puts them, is the fallback, so a service that fills it still works.
 * A report with seconds but no token count (a cancelled response) is not usage
 * and would log as zeros.
 */
function readXaiResponseUsage(event: unknown): XaiResponseUsage | undefined {
  if (!isRecord(event) || event.type !== "response.done") {
    return undefined;
  }
  const nested = isRecord(event.response) ? event.response.usage : undefined;
  const usage = [event.usage, nested].find(
    (candidate): candidate is Record<string, unknown> =>
      isRecord(candidate) &&
      TOKEN_COUNT_KEYS.some((key) => typeof candidate[key] === "number"),
  );
  if (usage === undefined) {
    return undefined;
  }
  return {
    inputTokens: countOf(usage, "input_tokens"),
    inputAudioTokens: detailOf(usage, "input_token_details", "audio_tokens"),
    outputTokens: countOf(usage, "output_tokens"),
    outputAudioTokens: detailOf(usage, "output_token_details", "audio_tokens"),
  };
}

/** The same record the agent logs for the Gemini backend, built from the same three counts. */
function logUsage(usage: XaiResponseUsage): void {
  logger.info("realtime.usage", {
    inputTokens: usage.inputTokens,
    inputAudioTokens: usage.inputAudioTokens,
    inputTextTokens: Math.max(0, usage.inputTokens - usage.inputAudioTokens),
    outputTokens: usage.outputTokens,
    outputAudioTokens: usage.outputAudioTokens,
    outputTextTokens: Math.max(0, usage.outputTokens - usage.outputAudioTokens),
  });
}

function describeRefusal(status: number): string {
  const keyHint = KEY_REFUSAL_STATUSES.has(status)
    ? " xAI answers a wrong XAI_API_KEY with HTTP 400, not 401, so check the key first."
    : "";
  return `xAI refused the realtime connection with HTTP ${status}.${keyHint}`;
}

/**
 * Turn the plugin's uncaught socket error into the error event the plugin
 * meant to emit. Returns the function that ends the watch.
 *
 * `uncaughtExceptionMonitor` observes a crash without handling it, so the
 * process still fails exactly as it would have; what changes is that the
 * session reports a classified, unrecoverable error first, which the agent
 * entry already logs and publishes. The watch is on only while the connection
 * is being made, so it cannot take a crash elsewhere in the process for a
 * refused upgrade once the call is running.
 *
 * A crash event carries no socket, so a refusal cannot be tied to one session:
 * every session still connecting is told. That is accurate, because the crash
 * ends the process for all of them, and the sessions of one process share
 * `XAI_API_KEY`, so a refused key is refused for each.
 */
function watchForRefusedUpgrade(session: XaiObservedSession): () => void {
  const onCrash = (error: unknown): void => {
    const status =
      error instanceof Error
        ? Number(REFUSED_UPGRADE.exec(error.message)?.[1])
        : Number.NaN;
    if (Number.isNaN(status)) {
      return;
    }
    stop();
    const message = describeRefusal(status);
    logger.error("realtime.xai.connectRefused", { status, error: message });
    if (session.listenerCount("error") === 0) {
      return;
    }
    try {
      session.emit("error", {
        type: "realtime_model_error",
        timestamp: Date.now(),
        label: "xai.RealtimeModel",
        error: new Error(message),
        recoverable: false,
      });
    } catch {
      /* the process is already failing; a listener's error must not mask it */
    }
  };
  const stop = (): void => {
    process.off("uncaughtExceptionMonitor", onCrash);
  };
  process.on("uncaughtExceptionMonitor", onCrash);
  return stop;
}

/**
 * Log the usage of every response, warn when the service runs another model
 * than the one asked for, and report a refused upgrade as a session error.
 * `requestedModel` is the id the session was configured with.
 */
export function observeXaiSession(
  session: XaiObservedSession,
  requestedModel: string,
): void {
  const stopWatching = watchForRefusedUpgrade(session);
  session.on("openai_server_event_received", (event: unknown) => {
    if (isRecord(event) && event.type === "session.created") {
      stopWatching();
      const served = isRecord(event.session) ? event.session.model : undefined;
      if (typeof served === "string" && served !== requestedModel) {
        logger.warn("realtime.xai.modelMismatch", {
          requested: requestedModel,
          served,
          note: "xAI runs a default model for an id it does not know, without an error; an alias comes back as the model it points to",
        });
      }
      return;
    }
    const usage = readXaiResponseUsage(event);
    if (usage !== undefined) {
      logUsage(usage);
    }
  });
  const close = session.close.bind(session);
  session.close = async () => {
    stopWatching();
    await close();
  };
}
