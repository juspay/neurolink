/**
 * Data-channel event bridge.
 *
 * Connects NeuroLink's event emitter to the LiveKit room's data channel: it
 * forwards NeuroLink events (text deltas, tool start/result, HITL prompts,
 * stream lifecycle) to the browser as small versioned envelopes, and accepts
 * control messages (HITL responses) back, re-emitting them onto the emitter so
 * NeuroLink's HITL manager resolves.
 *
 * This is the WebRTC counterpart of the chat-mode SSE controller: same event
 * source, different transport. The browser renders the envelopes (transcript,
 * tool status, charts, confirmation prompts).
 *
 * `@livekit/rtc-node` is an optional dependency, imported dynamically only for
 * the `RoomEvent` enum value. All payloads arrive typed as `unknown` and are
 * narrowed with runtime guards — no type assertions.
 *
 * See docs/features/livekit-voice-agent.md.
 */

import { logger } from "../../utils/logger.js";
import type {
  ConfirmationResponseEvent,
  LiveKitEventBridgeHandle,
  LiveKitEventBridgeParams,
  LiveKitToolEventFields,
  LiveKitVoiceControlMessage,
  LiveKitVoiceEvent,
  LiveKitVoiceEventEnvelope,
  LiveKitVoiceEventType,
  LiveKitVoiceHitlPromptEvent,
  LiveKitVoiceUserTextEvent,
} from "../../types/index.js";

const DEFAULT_EVENTS_TOPIC = "ai-events";
const DEFAULT_CONTROL_TOPIC = "ai-control";
const DEFAULT_MAX_INLINE_BYTES = 12_000;

/** NeuroLink emitter event names this bridge forwards. */
const USER_TEXT_EVENT = "voice:user-transcript";
const TEXT_EVENT = "response:chunk";
const TOOL_START_EVENT = "tool:start";
const TOOL_END_EVENT = "tool:end";
const HITL_REQUEST_EVENT = "hitl:confirmation-request";
const STREAM_START_EVENT = "stream:start";
const STREAM_COMPLETE_EVENT = "stream:complete";
const STREAM_END_EVENT = "stream:end";
const STREAM_ERROR_EVENT = "stream:error";

/** Read a property off a non-null object as `unknown` without a type assertion. */
function readProp(source: object, key: string): unknown {
  return Reflect.get(source, key);
}

/** Narrow an unknown value to a non-null object, or `undefined`. */
function asObject(value: unknown): object | undefined {
  return typeof value === "object" && value !== null ? value : undefined;
}

/** Extract the text delta from a `response:chunk` payload. */
function readTextDelta(payload: unknown): string | undefined {
  return typeof payload === "string" && payload.length > 0
    ? payload
    : undefined;
}

/** Extract tool fields from a `tool:start` / `tool:end` payload. */
function readToolFields(payload: unknown): LiveKitToolEventFields | undefined {
  const obj = asObject(payload);
  if (!obj) {
    return undefined;
  }
  const toolName = readProp(obj, "toolName");
  const tool = readProp(obj, "tool");
  const name =
    typeof toolName === "string"
      ? toolName
      : typeof tool === "string"
        ? tool
        : undefined;
  if (name === undefined) {
    return undefined;
  }
  const fields: LiveKitToolEventFields = { name };
  const executionId = readProp(obj, "executionId");
  if (typeof executionId === "string") {
    fields.id = executionId;
  }
  const input = readProp(obj, "input");
  if (input !== undefined) {
    fields.input = input;
  }
  const result = readProp(obj, "result");
  if (result !== undefined) {
    fields.result = result;
  }
  const success = readProp(obj, "success");
  if (typeof success === "boolean") {
    fields.success = success;
  }
  const error = readProp(obj, "error");
  if (typeof error === "string") {
    fields.error = error;
  }
  return fields;
}

/** Extract the HITL prompt fields from a `hitl:confirmation-request` payload. */
function readHitlPrompt(
  payload: unknown,
): LiveKitVoiceHitlPromptEvent | undefined {
  const event = asObject(payload);
  if (!event) {
    return undefined;
  }
  const inner = asObject(readProp(event, "payload"));
  if (!inner) {
    return undefined;
  }
  const confirmationId = readProp(inner, "confirmationId");
  const toolName = readProp(inner, "toolName");
  if (typeof confirmationId !== "string" || typeof toolName !== "string") {
    return undefined;
  }
  const data: LiveKitVoiceHitlPromptEvent["data"] = {
    confirmationId,
    toolName,
  };
  const actionType = readProp(inner, "actionType");
  if (typeof actionType === "string") {
    data.actionType = actionType;
  }
  const args = readProp(inner, "arguments");
  if (args !== undefined) {
    data.arguments = args;
  }
  const timeoutMs = readProp(inner, "timeoutMs");
  if (typeof timeoutMs === "number") {
    data.timeoutMs = timeoutMs;
  }
  const allowModification = readProp(inner, "allowModification");
  if (typeof allowModification === "boolean") {
    data.allowModification = allowModification;
  }
  return { type: "hitl-prompt", data };
}

/** Narrow a decoded inbound message to a control message, or `undefined`. */
function readControlMessage(
  value: unknown,
): LiveKitVoiceControlMessage | undefined {
  const obj = asObject(value);
  if (!obj) {
    return undefined;
  }
  const action = readProp(obj, "action");
  const confirmationId = readProp(obj, "confirmationId");
  if (typeof confirmationId !== "string") {
    return undefined;
  }
  if (action === "hitl:accept") {
    const message: LiveKitVoiceControlMessage = {
      action: "hitl:accept",
      confirmationId,
    };
    const modifiedArguments = readProp(obj, "modifiedArguments");
    if (modifiedArguments !== undefined) {
      message.modifiedArguments = modifiedArguments;
    }
    return message;
  }
  if (action === "hitl:reject") {
    const message: LiveKitVoiceControlMessage = {
      action: "hitl:reject",
      confirmationId,
    };
    const reason = readProp(obj, "reason");
    if (typeof reason === "string") {
      message.reason = reason;
    }
    return message;
  }
  return undefined;
}

/**
 * Attach the data-channel event bridge to a room.
 *
 * Returns a handle whose `dispose()` removes every listener and stops
 * publishing; it is safe to call more than once.
 */
export async function attachEventBridge(
  params: LiveKitEventBridgeParams,
): Promise<LiveKitEventBridgeHandle> {
  const { room, emitter, options } = params;

  const eventsTopic = options?.eventsTopic ?? DEFAULT_EVENTS_TOPIC;
  const controlTopic = options?.controlTopic ?? DEFAULT_CONTROL_TOPIC;
  const maxInlineBytes = options?.maxInlineBytes ?? DEFAULT_MAX_INLINE_BYTES;
  const include =
    options?.include && options.include.length > 0
      ? new Set<LiveKitVoiceEventType>(options.include)
      : undefined;

  const { RoomEvent } = await import("@livekit/rtc-node");

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let seq = 0;
  let disposed = false;

  function publish(event: LiveKitVoiceEvent): void {
    if (disposed) {
      return;
    }
    if (include && !include.has(event.type)) {
      return;
    }
    const localParticipant = room.localParticipant;
    if (!localParticipant) {
      return;
    }
    seq += 1;
    const envelope: LiveKitVoiceEventEnvelope = Object.assign(
      { seq, ts: Date.now() },
      event,
    );
    const json = JSON.stringify(envelope);
    const bytes = encoder.encode(json);
    const onError = (transport: string) => (error: unknown) => {
      logger.warn("[LiveKitEventBridge] Failed to publish event", {
        transport,
        type: event.type,
        error: error instanceof Error ? error.message : String(error),
      });
    };
    if (bytes.byteLength <= maxInlineBytes) {
      void localParticipant
        .publishData(bytes, { reliable: true, topic: eventsTopic })
        .catch(onError("publishData"));
    } else {
      // Large payloads (e.g. chart data) exceed a single reliable data packet;
      // the chunked text stream handles arbitrary sizes.
      void localParticipant
        .sendText(json, { topic: eventsTopic })
        .catch(onError("sendText"));
    }
  }

  // --- Outbound: NeuroLink emitter → data channel ---------------------------

  const onUserText = (...args: unknown[]): void => {
    const payload = asObject(args[0]);
    if (!payload) {
      return;
    }
    const text = readProp(payload, "text");
    const final = readProp(payload, "final");
    const replacesPrevious = readProp(payload, "replacesPrevious");
    if (typeof text === "string" && text.trim().length > 0) {
      const data: LiveKitVoiceUserTextEvent["data"] = {
        text,
        final: final === true,
      };
      if (replacesPrevious === true) {
        data.replacesPrevious = true;
      }
      publish({ type: "user-text", data });
    }
  };

  const onText = (...args: unknown[]): void => {
    const delta = readTextDelta(args[0]);
    if (delta !== undefined) {
      publish({ type: "text", data: { delta } });
    }
  };

  const onToolStart = (...args: unknown[]): void => {
    const fields = readToolFields(args[0]);
    if (fields) {
      publish({
        type: "tool-start",
        data: { id: fields.id, name: fields.name, input: fields.input },
      });
    }
  };

  const onToolEnd = (...args: unknown[]): void => {
    const fields = readToolFields(args[0]);
    if (fields) {
      publish({
        type: "tool-result",
        data: {
          id: fields.id,
          name: fields.name,
          result: fields.result,
          success: fields.success,
          error: fields.error,
        },
      });
    }
  };

  const onHitlRequest = (...args: unknown[]): void => {
    const event = readHitlPrompt(args[0]);
    if (event) {
      publish(event);
    }
  };

  const onStreamStart = (): void => {
    publish({ type: "status", data: { state: "thinking" } });
  };

  const onStreamComplete = (): void => {
    publish({ type: "done", data: {} });
  };

  const onStreamError = (...args: unknown[]): void => {
    const obj = asObject(args[0]);
    const message = obj ? readProp(obj, "message") : undefined;
    publish({
      type: "status",
      data: {
        state: "error",
        detail: typeof message === "string" ? message : undefined,
      },
    });
  };

  emitter.on(USER_TEXT_EVENT, onUserText);
  emitter.on(TEXT_EVENT, onText);
  emitter.on(TOOL_START_EVENT, onToolStart);
  emitter.on(TOOL_END_EVENT, onToolEnd);
  emitter.on(HITL_REQUEST_EVENT, onHitlRequest);
  emitter.on(STREAM_START_EVENT, onStreamStart);
  emitter.on(STREAM_COMPLETE_EVENT, onStreamComplete);
  emitter.on(STREAM_END_EVENT, onStreamComplete);
  emitter.on(STREAM_ERROR_EVENT, onStreamError);

  // --- Inbound: data channel → NeuroLink emitter (HITL responses) -----------

  const onData = (...args: unknown[]): void => {
    const payload = args[0];
    const topic = args[3];
    if (topic !== controlTopic || !(payload instanceof Uint8Array)) {
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(decoder.decode(payload));
    } catch (error) {
      logger.warn("[LiveKitEventBridge] Dropping malformed control message", {
        error: error instanceof Error ? error.message : String(error),
      });
      return;
    }
    const message = readControlMessage(parsed);
    if (!message) {
      return;
    }
    const responsePayload: ConfirmationResponseEvent["payload"] = {
      confirmationId: message.confirmationId,
      approved: message.action === "hitl:accept",
      metadata: { timestamp: new Date().toISOString(), responseTime: 0 },
    };
    if (message.action === "hitl:reject" && message.reason !== undefined) {
      responsePayload.reason = message.reason;
    }
    if (
      message.action === "hitl:accept" &&
      message.modifiedArguments !== undefined
    ) {
      responsePayload.modifiedArguments = message.modifiedArguments;
    }
    emitter.emit("hitl:confirmation-response", {
      type: "hitl:confirmation-response",
      payload: responsePayload,
    });
  };

  room.on(RoomEvent.DataReceived, onData);

  publish({ type: "status", data: { state: "listening" } });

  logger.info("[LiveKitEventBridge] Attached", {
    eventsTopic,
    controlTopic,
    filtered: include !== undefined,
  });

  return {
    dispose(): void {
      if (disposed) {
        return;
      }
      disposed = true;
      emitter.off(USER_TEXT_EVENT, onUserText);
      emitter.off(TEXT_EVENT, onText);
      emitter.off(TOOL_START_EVENT, onToolStart);
      emitter.off(TOOL_END_EVENT, onToolEnd);
      emitter.off(HITL_REQUEST_EVENT, onHitlRequest);
      emitter.off(STREAM_START_EVENT, onStreamStart);
      emitter.off(STREAM_COMPLETE_EVENT, onStreamComplete);
      emitter.off(STREAM_END_EVENT, onStreamComplete);
      emitter.off(STREAM_ERROR_EVENT, onStreamError);
      room.off(RoomEvent.DataReceived, onData);
      logger.info("[LiveKitEventBridge] Disposed");
    },
  };
}
