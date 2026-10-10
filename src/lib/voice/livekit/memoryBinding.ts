/**
 * Signed memory binding for a voice call.
 *
 * A voice worker persists a call's turns to a conversation, so it has to know
 * WHOSE conversation and WHICH one — and it must not take either from anything
 * a participant can influence. The manager that creates the room (for example
 * a `/start` endpoint) already holds the verified session, so it signs a small
 * binding and writes it into the room metadata next to `authToken` and
 * `mcpContext`:
 *
 *   base64(JSON({ authToken, mcpContext, memory: { userId, sessionId, exp, sig } }))
 *
 * The worker verifies the signature with the same shared secret. The signature
 * covers the room name, so a binding copied into another room does not verify.
 * Room metadata is readable by participants, so this does not hide the ids; it
 * stops anyone without the secret from choosing them.
 *
 * Everything here fails closed. A missing secret, a missing or malformed
 * binding, a bad signature or an expired binding all yield `{ ok: false }`, and
 * the caller carries on with the call, storing nothing.
 *
 * See docs/features/livekit-voice-agent.md.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { Buffer } from "node:buffer";
import { z } from "zod";
import type {
  VoiceMemoryBinding,
  VoiceMemoryBindingInput,
  VoiceMemoryBindingVerdict,
  VoiceMemoryBindingVerifyInput,
} from "../../types/index.js";

/** Domain-separation label that starts every signed message. */
export const VOICE_MEMORY_BINDING_VERSION = "neurolink.voice.memory.v1";

/** Environment variable the worker reads the shared secret from when none is passed in. */
export const VOICE_MEMORY_SECRET_ENV = "NEUROLINK_VOICE_MEMORY_SECRET";

/** Longest expiry, counted from now, that a worker accepts (24 hours). */
export const VOICE_MEMORY_MAX_TTL_SECONDS = 24 * 60 * 60;

/** A secret shorter than this is treated as absent. */
const MIN_SECRET_LENGTH = 16;

const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
// Whitespace and control characters are refused; ":" is allowed because the
// chat user id is itself composed with it (customer:merchant:shop).
// eslint-disable-next-line no-control-regex
const USER_ID_PATTERN = /^[^\s\u0000-\u001f\u007f]{1,256}$/u;

/** A conversation id a voice call may append to: letters, digits, "_" and "-", up to 128, no ":". */
export function isValidVoiceSessionId(value: unknown): value is string {
  return typeof value === "string" && SESSION_ID_PATTERN.test(value);
}

/** A user id a voice call may be bound to: 1 to 256 characters, no whitespace or control characters. */
export function isValidVoiceUserId(value: unknown): value is string {
  return typeof value === "string" && USER_ID_PATTERN.test(value);
}

function usableSecret(secret: string | undefined): secret is string {
  return typeof secret === "string" && secret.length >= MIN_SECRET_LENGTH;
}

/**
 * What is signed. A JSON array, not a delimiter-joined string, so no choice of
 * field values can make two different bindings produce the same message.
 */
function signedMessage(
  room: string,
  userId: string,
  sessionId: string,
  exp: number,
): string {
  return JSON.stringify([
    VOICE_MEMORY_BINDING_VERSION,
    room,
    userId,
    sessionId,
    exp,
  ]);
}

function signature(secret: string, message: string): Buffer {
  return createHmac("sha256", secret).update(message).digest();
}

/**
 * Sign a binding for a room. Throws on an unusable secret or invalid ids: the
 * signer is the trusted side, and a binding it cannot sign correctly is a bug
 * to surface there, not something to paper over.
 */
export function signVoiceMemoryBinding(
  input: VoiceMemoryBindingInput,
): VoiceMemoryBinding {
  const { room, userId, sessionId, secret } = input;
  if (!room) {
    throw new Error("A voice memory binding needs the room name");
  }
  if (!usableSecret(secret)) {
    throw new Error(
      `The voice memory secret must be at least ${MIN_SECRET_LENGTH} characters`,
    );
  }
  if (!isValidVoiceUserId(userId)) {
    throw new Error("Invalid voice memory userId");
  }
  if (!isValidVoiceSessionId(sessionId)) {
    throw new Error("Invalid voice memory sessionId");
  }
  const now = input.now ?? Math.floor(Date.now() / 1000);
  const ttl = input.ttlSeconds ?? 2 * 60 * 60;
  if (
    !Number.isInteger(ttl) ||
    ttl <= 0 ||
    ttl > VOICE_MEMORY_MAX_TTL_SECONDS
  ) {
    throw new Error(
      `ttlSeconds must be a whole number between 1 and ${VOICE_MEMORY_MAX_TTL_SECONDS}`,
    );
  }
  const exp = now + ttl;
  const sig = signature(
    secret,
    signedMessage(room, userId, sessionId, exp),
  ).toString("base64url");
  return { userId, sessionId, exp, sig };
}

const bindingSchema = z.object({
  userId: z.string(),
  sessionId: z.string(),
  exp: z.number().int(),
  sig: z.string(),
});

const roomMetadataSchema = z.object({ memory: z.unknown().optional() });

function decodeMetadata(encoded: string): unknown {
  try {
    return JSON.parse(Buffer.from(encoded, "base64").toString("utf-8"));
  } catch {
    return undefined;
  }
}

/**
 * Read and verify the memory binding in a room's metadata.
 *
 * Never throws and never logs ids. `reason` says why a binding was rejected so
 * the caller can log it.
 */
export function verifyVoiceMemoryBinding(
  input: VoiceMemoryBindingVerifyInput,
): VoiceMemoryBindingVerdict {
  const { roomMetadata, roomName, secret } = input;
  if (!usableSecret(secret)) {
    return { ok: false, reason: "no-secret" };
  }
  if (!roomName || !roomMetadata) {
    return { ok: false, reason: "no-binding" };
  }
  const metadata = roomMetadataSchema.safeParse(decodeMetadata(roomMetadata));
  if (!metadata.success || metadata.data.memory === undefined) {
    return { ok: false, reason: "no-binding" };
  }
  const parsed = bindingSchema.safeParse(metadata.data.memory);
  if (!parsed.success) {
    return { ok: false, reason: "malformed" };
  }
  const { userId, sessionId, exp, sig } = parsed.data;
  if (!isValidVoiceUserId(userId) || !isValidVoiceSessionId(sessionId)) {
    return { ok: false, reason: "malformed" };
  }
  const expected = signature(
    secret,
    signedMessage(roomName, userId, sessionId, exp),
  );
  const presented = Buffer.from(sig, "base64url");
  if (
    presented.length !== expected.length ||
    !timingSafeEqual(presented, expected)
  ) {
    return { ok: false, reason: "bad-signature" };
  }
  const now = input.now ?? Math.floor(Date.now() / 1000);
  if (exp <= now) {
    return { ok: false, reason: "expired" };
  }
  if (exp - now > VOICE_MEMORY_MAX_TTL_SECONDS) {
    return { ok: false, reason: "expiry-too-far" };
  }
  return { ok: true, userId, sessionId, exp };
}
