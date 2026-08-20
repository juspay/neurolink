/**
 * Forwarding a borrowed request to a lender's proxy.
 *
 * The wire format is unchanged Anthropic Messages in both directions, so this is
 * a passthrough, not a translation: the lender's proxy speaks exactly what the
 * borrower's client already sent. That is what makes peer borrowing cheap
 * compared with the provider fallback chain, which has to reshape the request
 * for a different API.
 *
 * **Reading the refusal, not the status.** A lender's 429 can mean "your grant
 * is spent" or "the upstream throttled me"; those want opposite reactions from
 * the borrower. The distinction is carried in `x-neurolink-grant-reason`, so
 * that header — not the status code — decides how long the peer is parked.
 *
 * @module proxy/peerTransport
 */

import type {
  ProxyPeer,
  ProxyPeerAttempt,
  ProxyPeerCooldownReason,
  ProxyPeerObservation,
} from "../types/index.js";
import { logger } from "../utils/logger.js";
import { coolPeer, recordPeerSuccess } from "./peerStore.js";

/** A peer is a fallback, so it gets a short leash before we move on. */
const PEER_CONNECT_TIMEOUT_MS = 15_000;

/**
 * Longest silence tolerated once a peer has started answering.
 *
 * The connect timer is cleared as soon as headers arrive, which on a streamed
 * response is long before the answer is. Without a second deadline a lender
 * that opens the stream and then stops writing holds our client open forever —
 * a borrowed request is the fallback path and should never be the one that
 * hangs. Generous, because a long thinking pause is a legitimate silence.
 */
const PEER_IDLE_TIMEOUT_MS = 120_000;

/**
 * Map a lender's refusal to how long the peer should be left alone.
 *
 * Anything not recognized is treated as an upstream problem rather than a grant
 * problem — the conservative reading, since it recovers soonest.
 */
export function peerReasonFromRefusal(
  grantReason: string | null,
): ProxyPeerCooldownReason {
  switch (grantReason) {
    case "exhausted":
      return "exhausted";
    case "paused":
      return "paused";
    case "revoked":
      return "revoked";
    case "expired":
      return "expired";
    case "reserve_floor":
    case "spillover_inactive":
    case "slice_exhausted":
    case "no_capacity":
      return "withheld";
    case "missing_token":
    case "unknown_token":
    case "malformed_token":
      // The lender does not recognize us at all. Treat it like a revocation:
      // retrying a token the lender has forgotten cannot start working again.
      return "revoked";
    default:
      // No grant reason means the lender never got as far as our grant — this
      // is its own upstream or credential trouble, not a statement about us.
      // Reading a bare 401 as a revocation would park a perfectly good peer for
      // a day because the lender briefly had no usable account.
      return "upstream_error";
  }
}

/**
 * A numeric header, or `undefined` when the peer did not send one.
 *
 * `Number(null)` and `Number("")` are both `0`, and `0` passes
 * `Number.isFinite` — so reading these headers directly turns "the lender said
 * nothing" into "the lender said zero", which on a remaining-coins header reads
 * as an exhausted peer.
 */
function numericHeader(response: Response, name: string): number | undefined {
  const raw = response.headers.get(name);
  if (raw === null || raw.trim() === "") {
    return undefined;
  }
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

function observationFrom(response: Response): ProxyPeerObservation {
  const remaining = numericHeader(
    response,
    "x-neurolink-grant-remaining-coins",
  );
  return {
    observedAt: Date.now(),
    ...(response.headers.get("x-neurolink-grant-status")
      ? { grantStatus: response.headers.get("x-neurolink-grant-status") ?? "" }
      : {}),
    ...(response.headers.get("x-neurolink-grant-reason")
      ? { grantReason: response.headers.get("x-neurolink-grant-reason") ?? "" }
      : {}),
    ...(remaining !== undefined ? { remainingCoins: remaining } : {}),
  };
}

/**
 * Re-arm a deadline on every chunk, and abandon the peer if one never comes.
 *
 * The body is passed through rather than buffered: the point of handing the
 * upstream response back is that a stream keeps streaming, and collecting it
 * here would add the whole generation time to time-to-first-token on a path
 * that is already a second hop.
 */
function withIdleDeadline(
  response: Response,
  peer: ProxyPeer,
  controller: AbortController,
): Response {
  const body = response.body;
  if (!body) {
    return response;
  }
  let idle: ReturnType<typeof setTimeout> | undefined;
  const disarm = () => {
    if (idle !== undefined) {
      clearTimeout(idle);
      idle = undefined;
    }
  };
  const arm = () => {
    disarm();
    idle = setTimeout(() => {
      logger.always(
        `[proxy] peer=${peer.name} went quiet mid-response; abandoning it`,
      );
      // Cool it here as well. The success path cleared this peer's cooldown the
      // moment the response headers arrived, which is long before a body stops
      // arriving — so a peer that answers 200 and then stalls would otherwise
      // stay perfectly healthy in the store and be picked again, and again, for
      // the same stall. Failing mid-body is a failure like any other.
      void coolPeer(peer.name, "unreachable").catch((error) => {
        logger.debug(
          `[proxy] could not cool peer=${peer.name} after a stall: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      });
      // Aborting the fetch errors the stream, which is what the caller needs to
      // see — a truncated answer presented as a complete one would be worse.
      controller.abort();
    }, PEER_IDLE_TIMEOUT_MS);
    idle.unref?.();
  };
  const watched = body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      start: arm,
      transform(chunk, target) {
        arm();
        target.enqueue(chunk);
      },
      flush: disarm,
    }),
  );
  controller.signal.addEventListener("abort", disarm, { once: true });
  return new Response(watched, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

/**
 * Send one request to one peer.
 *
 * On success the upstream `Response` is handed back with only an idle deadline
 * wrapped around its body, so a stream keeps streaming — buffering it here
 * would add the whole generation time to time-to-first-token on a path that is
 * already a second hop.
 */
export async function forwardToPeer(args: {
  peer: ProxyPeer;
  body: string;
  stream: boolean;
  signal?: AbortSignal;
}): Promise<ProxyPeerAttempt> {
  const { peer, body, stream } = args;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PEER_CONNECT_TIMEOUT_MS);
  if (args.signal) {
    if (args.signal.aborted) {
      controller.abort();
    } else {
      args.signal.addEventListener("abort", () => controller.abort(), {
        once: true,
      });
    }
  }

  try {
    const response = await fetch(`${peer.url}/v1/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-neurolink-share-token": peer.token,
        accept: stream ? "text/event-stream" : "application/json",
      },
      body,
      signal: controller.signal,
    });

    if (response.ok) {
      // Outside the classification below on purpose. This is bookkeeping over a
      // response that already succeeded, and a disk that will not take the note
      // says nothing about the peer — letting it fall through to the catch
      // would cool a peer that had just answered correctly.
      await recordPeerSuccess(peer.name, observationFrom(response)).catch(
        (error) => {
          logger.debug(
            `[proxy] could not record success for peer=${peer.name}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        },
      );
      return {
        ok: true,
        response: withIdleDeadline(response, peer, controller),
        peer,
      };
    }

    const grantReason = response.headers.get("x-neurolink-grant-reason");
    const reason = peerReasonFromRefusal(grantReason);
    const retryAfter = numericHeader(response, "retry-after");
    await coolPeer(peer.name, reason, retryAfter);
    // The body is drained but deliberately not surfaced: it is the lender's
    // wording about the lender's pool, and forwarding it to our client would
    // leak their account state into an error our client cannot act on.
    await response.text().catch(() => "");
    logger.always(
      `[proxy] peer=${peer.name} declined (${reason}); cooling before retry`,
    );
    return {
      ok: false,
      peer,
      status: response.status,
      reason,
      message: `peer ${peer.name} declined: ${reason}`,
      ...(retryAfter !== undefined ? { retryAfterSeconds: retryAfter } : {}),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (args.signal?.aborted) {
      // Our own client hung up, and the abort we are catching is the one we
      // forwarded on its behalf. The peer did nothing wrong — cooling it here
      // would let a client that cancels quickly take a whole mesh out of
      // rotation one peer per cancellation.
      logger.debug(
        `[proxy] peer=${peer.name} attempt cancelled by the caller: ${message}`,
      );
      return {
        ok: false,
        peer,
        reason: "unreachable",
        message: `peer ${peer.name} attempt cancelled`,
      };
    }
    await coolPeer(peer.name, "unreachable").catch((coolError) => {
      logger.debug(
        `[proxy] could not cool peer=${peer.name}: ${
          coolError instanceof Error ? coolError.message : String(coolError)
        }`,
      );
    });
    logger.always(`[proxy] peer=${peer.name} unreachable: ${message}`);
    return {
      ok: false,
      peer,
      reason: "unreachable",
      message: `peer ${peer.name} unreachable`,
    };
  } finally {
    clearTimeout(timeout);
  }
}
