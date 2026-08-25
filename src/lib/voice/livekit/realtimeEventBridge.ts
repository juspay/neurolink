/**
 * Realtime data-channel event bridge.
 *
 * The cascaded bridge (`eventBridge.ts`) is driven by NeuroLink's event emitter.
 */

import { z } from "zod";
import { logger } from "../../utils/logger.js";
import type {
  RealtimeEventBridgeHandle,
  RealtimeEventBridgeParams,
} from "../../types/index.js";

const DEFAULT_EVENTS_TOPIC = "ai-events";
const DEFAULT_CONTROL_TOPIC = "ai-control";
const DEFAULT_MAX_INLINE_BYTES = 12_000;
const DEFAULT_HITL_TIMEOUT_MS = 45_000;

const hitlControlMessageSchema = z.object({
  action: z.enum(["hitl:accept", "hitl:reject"]),
  confirmationId: z.string(),
});

/**
 * Attach the realtime event bridge to a room.
 *
 * Returns `publishEvent` (worker → browser), `requestConfirmation` (HITL
 * round-trip), and `dispose` (remove the control listener, decline anything
 * still pending).
 */
export async function attachRealtimeEventBridge(
  params: RealtimeEventBridgeParams,
): Promise<RealtimeEventBridgeHandle> {
  const { room } = params;
  const eventsTopic = params.eventsTopic ?? DEFAULT_EVENTS_TOPIC;
  const controlTopic = params.controlTopic ?? DEFAULT_CONTROL_TOPIC;
  const maxInlineBytes = params.maxInlineBytes ?? DEFAULT_MAX_INLINE_BYTES;
  const hitlTimeoutMs = params.hitlTimeoutMs ?? DEFAULT_HITL_TIMEOUT_MS;

  const { RoomEvent } = await import("@livekit/rtc-node");
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let seq = 0;
  let disposed = false;
  const startedAt = Date.now();

  const publishEvent: RealtimeEventBridgeHandle["publishEvent"] = (
    type,
    data,
  ) => {
    if (disposed) {
      return;
    }
    const participant = room.localParticipant;
    if (!participant) {
      return;
    }
    try {
      seq += 1;
      const json = JSON.stringify({ seq, ts: Date.now(), type, data });
      const bytes = encoder.encode(json);
      const via = bytes.byteLength <= maxInlineBytes ? "data" : "stream";

      logger.debug("realtime.bridge.publish", {
        ms: Date.now() - startedAt,
        seq,
        type,
        via,
        bytes: bytes.byteLength,
      });
      // Both calls are detached on purpose — the bridge must never make the
      // caller wait on the UI. But `void` alone does NOT make a rejection
      // harmless, and the try/catch below cannot help: a synchronous catch
      // never sees a rejected promise. Measured — a rejecting publish with
      // this exact shape leaves the catch untouched and, with no
      // unhandledRejection handler installed, terminates the process:
      //   SYNC_CATCH_FIRED = false · UNHANDLED_COUNT = 1 · exit 1
      // These are network calls to a peer that can disconnect mid-publish, so
      // the rejection is ordinary, not exotic. Attaching a handler is what
      // actually makes the bridge best-effort, which is what the catch below
      // only claimed. Same class as the detached-pump crash in anthropic.
      const publishFailed = (error: unknown): void => {
        logger.debug("realtime.bridge.publishFailed", {
          seq,
          type,
          via,
          error: error instanceof Error ? error.message : String(error),
        });
      };
      if (via === "data") {
        void participant
          .publishData(bytes, { reliable: true, topic: eventsTopic })
          .catch(publishFailed);
      } else {
        void participant
          .sendText(json, { topic: eventsTopic })
          .catch(publishFailed);
      }
    } catch {
      /* non-fatal — covers the synchronous half only (encode/stringify);
         the detached publishes carry their own handler above. */
    }
  };

  // HITL: WRITE-labeled tools pause for user confirmation. We publish a
  // `hitl-prompt`, the UI replies on the control topic, and we resolve the
  // pending request by confirmationId. A timeout is treated as a decline so a
  // turn can never hang waiting on the user.
  const pendingHitl = new Map<string, (approved: boolean) => void>();
  let hitlSeq = 0;

  const onData = (...args: unknown[]): void => {
    const payload = args[0];
    const topic = args[3];
    if (topic !== controlTopic || !(payload instanceof Uint8Array)) {
      return;
    }
    let raw: unknown;
    try {
      raw = JSON.parse(decoder.decode(payload));
    } catch {
      return;
    }
    const message = hitlControlMessageSchema.safeParse(raw);
    if (!message.success) {
      return;
    }
    const { action, confirmationId } = message.data;
    const resolver = pendingHitl.get(confirmationId);
    if (resolver) {
      logger.debug("realtime.bridge.controlReceived", {
        action,
        confirmationId,
      });
      pendingHitl.delete(confirmationId);
      resolver(action === "hitl:accept");
    } else {
      logger.warn("realtime.bridge.controlUnmatched", {
        action,
        confirmationId,
      });
    }
  };

  room.on(RoomEvent.DataReceived, onData);

  const requestConfirmation: RealtimeEventBridgeHandle["requestConfirmation"] =
    (toolName, args) => {
      if (disposed) {
        logger.warn("realtime.bridge.hitlDisposed", { toolName });
        return Promise.resolve(false);
      }
      hitlSeq += 1;
      const confirmationId = `hitl_${seq}_${hitlSeq}`;
      publishEvent("hitl-prompt", {
        confirmationId,
        toolName,
        actionType: `Run ${toolName}`,
        arguments: args ?? {},
      });
      logger.info("realtime.bridge.hitlPrompt", { toolName, confirmationId });
      return new Promise<boolean>((resolve) => {
        const timer = setTimeout(() => {
          pendingHitl.delete(confirmationId);
          logger.warn("realtime.bridge.hitlTimeout", {
            toolName,
            confirmationId,
            timeoutMs: hitlTimeoutMs,
          });
          resolve(false);
        }, hitlTimeoutMs);
        pendingHitl.set(confirmationId, (approved) => {
          clearTimeout(timer);
          logger.info("realtime.bridge.hitlResolved", {
            toolName,
            confirmationId,
            approved,
          });
          resolve(approved);
        });
      });
    };

  return {
    publishEvent,
    requestConfirmation,
    dispose(): void {
      if (disposed) {
        return;
      }
      disposed = true;
      room.off(RoomEvent.DataReceived, onData);
      for (const [, resolver] of pendingHitl) {
        resolver(false);
      }
      pendingHitl.clear();
    },
  };
}
