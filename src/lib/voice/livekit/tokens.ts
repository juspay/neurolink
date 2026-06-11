/**
 * LiveKit join-token minting.
 *
 * Mints a short-lived JWT a browser uses to join a room. The token is signed
 * locally with the LiveKit API key/secret — no network call and no room
 * pre-creation (rooms are auto-created on first join).
 *
 * `livekit-server-sdk` is an optional dependency and is imported dynamically so
 * the core package does not require it unless the LiveKit voice agent is used.
 *
 */

import type { LiveKitTokenRequest } from "../../types/index.js";

const DEFAULT_TTL_SECONDS = 600;
/**
 * Upper bound on join-token lifetime (1 hour). A join token only needs to live
 * long enough for the participant to connect, so capping it keeps token-expiry
 * controls meaningful even if a caller requests a very large `ttlSeconds`.
 */
const MAX_TTL_SECONDS = 3600;

/**
 * Resolve a safe token lifetime. Non-finite or non-positive requests fall back
 * to the default; anything above the ceiling is clamped to `MAX_TTL_SECONDS`.
 */
function resolveTtlSeconds(ttlSeconds?: number): number {
  if (
    ttlSeconds === undefined ||
    !Number.isFinite(ttlSeconds) ||
    ttlSeconds <= 0
  ) {
    return DEFAULT_TTL_SECONDS;
  }
  return Math.min(Math.floor(ttlSeconds), MAX_TTL_SECONDS);
}

/**
 * Mint a LiveKit join token for an authenticated participant.
 *
 * Grants `roomJoin` plus publish/subscribe for the named room. The room is
 * created automatically by LiveKit when the first participant joins.
 */
export async function mintJoinToken(req: LiveKitTokenRequest): Promise<string> {
  const { AccessToken } = await import("livekit-server-sdk");

  const token = new AccessToken(req.apiKey, req.apiSecret, {
    identity: req.identity,
    ttl: resolveTtlSeconds(req.ttlSeconds),
  });

  token.addGrant({
    roomJoin: true,
    room: req.room,
    canPublish: true,
    canSubscribe: true,
  });

  return token.toJwt();
}
