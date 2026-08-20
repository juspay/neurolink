/**
 * Inbound gate for borrowed traffic.
 *
 * Transport-agnostic on purpose: it takes a header bag and returns a decision,
 * so the same gate covers the Anthropic, OpenAI and Codex route groups from one
 * place in the server bootstrap instead of being re-implemented per engine.
 *
 * **The refusal contract is the load-bearing part.** A borrower must be able to
 * tell "you are out of credit" from "the upstream throttled me". If both arrive
 * as a bare 429, the borrower's cooldown planner treats an exhausted grant as a
 * transient rate limit and retries a peer that will never serve it again this
 * week. Every refusal therefore carries `x-neurolink-grant-status` and
 * `x-neurolink-grant-reason`, and the borrower routes on those, not the status
 * code.
 *
 * @module proxy/shareGate
 */

import type {
  ProxyShareAdmission,
  ProxyShareGateOutcome,
  ProxyShareGrant,
  ProxyShareRefusalReason,
  ProxyShareRefusalResponse,
  ProxyShareRequestContext,
} from "../types/index.js";
import { logger } from "../utils/logger.js";
import { acquireShareSlot, readShareCounters } from "./shareContext.js";
import {
  looksLikeShareToken,
  resolveShareToken,
  touchShareGrantUsage,
} from "./shareGrants.js";
import {
  applyRefillIfDue,
  availableCoins,
  estimateHoldCoins,
  openShareHold,
  releaseShareHold,
} from "./shareLedger.js";
import {
  evaluateShareAdmission,
  isShareRefusal,
  shareRefusalMessage,
} from "./sharePolicy.js";

/** Dedicated header, so a share token never collides with a client credential. */
export const SHARE_TOKEN_HEADER = "x-neurolink-share-token";

export const GRANT_STATUS_HEADER = "x-neurolink-grant-status";
export const GRANT_REASON_HEADER = "x-neurolink-grant-reason";
export const GRANT_COINS_HEADER = "x-neurolink-grant-remaining-coins";
export const GRANT_PEER_HEADER = "x-neurolink-grant-peer";

/**
 * Pull a share token out of the request.
 *
 * `Authorization: Bearer` is accepted only when the value carries our token
 * prefix — a bare client forwarding its own Anthropic credential must never be
 * mistaken for a borrower, and a borrower must never have its token confused
 * with an upstream credential.
 */
export function extractShareToken(
  headers: Record<string, string | undefined>,
): string | undefined {
  const dedicated = headers[SHARE_TOKEN_HEADER];
  if (dedicated?.trim()) {
    return dedicated.trim();
  }
  const authorization = headers.authorization ?? headers.Authorization;
  if (!authorization) {
    return undefined;
  }
  const trimmed = authorization.trim();
  const bearer = trimmed.toLowerCase().startsWith("bearer ")
    ? trimmed.slice("bearer ".length).trim()
    : trimmed;
  return looksLikeShareToken(bearer) ? bearer : undefined;
}

/** Anthropic-shaped error type for a status, so clients parse it as usual. */
function errorTypeForStatus(status: number): string {
  if (status === 401) {
    return "authentication_error";
  }
  if (status === 403) {
    return "permission_error";
  }
  return "rate_limit_error";
}

/**
 * Grant lifecycle state as the borrower sees it. Distinct from the refusal
 * reason: the state answers "can this grant ever serve me again", the reason
 * answers "why not this request".
 */
function grantStatusHeaderValue(
  reason: ProxyShareRefusalReason,
  grant?: ProxyShareGrant,
): string {
  switch (reason) {
    case "paused":
      return "paused";
    case "revoked":
      return "revoked";
    case "expired":
      return "expired";
    case "exhausted":
      return "exhausted";
    case "out_of_window":
      return "out-of-window";
    case "missing_token":
    case "unknown_token":
    case "malformed_token":
      return "unauthorized";
    default:
      return grant?.state ?? "active";
  }
}

export function buildShareRefusal(
  reason: ProxyShareRefusalReason,
  options: {
    status: number;
    grant?: ProxyShareGrant;
    retryAfterSeconds?: number;
    message?: string;
  },
): ProxyShareRefusalResponse {
  const { status, grant, retryAfterSeconds } = options;
  const headers: Record<string, string> = {
    [GRANT_STATUS_HEADER]: grantStatusHeaderValue(reason, grant),
    [GRANT_REASON_HEADER]: reason,
  };
  if (grant) {
    headers[GRANT_PEER_HEADER] = grant.peerLabel;
    if (grant.entitlement.ledger === "coins") {
      headers[GRANT_COINS_HEADER] = String(
        Math.max(0, Math.floor(grant.entitlement.coins ?? 0)),
      );
    }
  }
  if (retryAfterSeconds !== undefined) {
    headers["retry-after"] = String(Math.max(1, Math.round(retryAfterSeconds)));
  }
  return {
    status,
    headers,
    body: {
      type: "error",
      error: {
        type: errorTypeForStatus(status),
        message: options.message ?? shareRefusalMessage(reason),
      },
    },
  };
}

function refusalOutcome(
  reason: ProxyShareRefusalReason,
  options: {
    status: number;
    grant?: ProxyShareGrant;
    retryAfterSeconds?: number;
    message?: string;
  },
): ProxyShareGateOutcome {
  return { kind: "refused", response: buildShareRefusal(reason, options) };
}

function toContext(
  grant: ProxyShareGrant,
  extra: { holdId?: string; model?: string },
): ProxyShareRequestContext {
  return {
    grantId: grant.id,
    peerLabel: grant.peerLabel,
    level: grant.level,
    gates: grant.gates,
    ledger: grant.entitlement.ledger,
    ...(extra.holdId ? { holdId: extra.holdId } : {}),
    ...(extra.model ? { model: extra.model } : {}),
  };
}

/**
 * Should an untokened request be refused?
 *
 * Off by default so a node's own client keeps working on loopback exactly as
 * before. It must be turned on before the listener is exposed — an exposed
 * listener without it hands the lender's subscription to anyone who can reach
 * the tunnel.
 */
export function isGrantRequiredByEnv(): boolean {
  const raw = (process.env.NEUROLINK_PROXY_REQUIRE_GRANT ?? "")
    .trim()
    .toLowerCase();
  return raw === "1" || raw === "true" || raw === "on" || raw === "yes";
}

/**
 * Decide whether an inbound request may proceed.
 *
 * An admitted outcome owns a concurrency slot; the caller **must** call
 * `release()` when the request finishes, including on error and on client
 * disconnect, or the grant's concurrency ceiling leaks.
 */
export async function admitInboundShareRequest(input: {
  headers: Record<string, string | undefined>;
  model?: string;
  /** Requested output ceiling, used only to size the pre-authorization. */
  maxTokens?: number;
  requireGrant?: boolean;
  coinBalanceLookup?: (grant: ProxyShareGrant) => Promise<number | undefined>;
  now?: number;
}): Promise<ProxyShareGateOutcome> {
  const now = input.now ?? Date.now();
  const requireGrant = input.requireGrant ?? isGrantRequiredByEnv();
  const token = extractShareToken(input.headers);

  if (!token) {
    if (!requireGrant) {
      return { kind: "local" };
    }
    return refusalOutcome("missing_token", {
      status: 401,
      message:
        "This proxy requires a share token. Ask the lender for one with " +
        "`neurolink proxy share create`.",
    });
  }

  const resolved = await resolveShareToken(token);
  if (!resolved) {
    return refusalOutcome("unknown_token", { status: 401 });
  }

  // A standing allowance tops up here rather than on a timer: a node that was
  // asleep across the boundary still refills on the next borrowed request.
  const grant =
    resolved.state === "active"
      ? await applyRefillIfDue(resolved, now)
      : resolved;

  const coinBalance =
    grant.entitlement.ledger === "coins"
      ? ((await input.coinBalanceLookup?.(grant)) ?? availableCoins(grant))
      : undefined;

  const admission: ProxyShareAdmission = evaluateShareAdmission({
    grant,
    now,
    model: input.model,
    counters: readShareCounters(grant.id, now),
    ...(coinBalance !== undefined ? { coinBalance } : {}),
  });

  if (isShareRefusal(admission)) {
    logger.debug(
      `[proxy] share refused peer=${grant.peerLabel} reason=${admission.reason}`,
    );
    return refusalOutcome(admission.reason, {
      status: admission.status,
      grant,
      ...(admission.retryAfterSeconds !== undefined
        ? { retryAfterSeconds: admission.retryAfterSeconds }
        : {}),
      message: admission.message,
    });
  }

  // Pre-authorize before the request goes upstream. Without this, concurrent
  // streams each pass the balance check and settle afterwards, overspending by
  // one request per stream in flight.
  const hold =
    grant.entitlement.ledger === "coins"
      ? openShareHold(
          grant.id,
          estimateHoldCoins(input.model, input.maxTokens),
          now,
        )
      : undefined;
  const releaseSlot = acquireShareSlot(grant.id, now);
  // Cosmetic, in-memory, flushed at most once a minute — see the store.
  touchShareGrantUsage(grant.id);

  return {
    kind: "admitted",
    context: toContext(grant, {
      ...(hold ? { holdId: hold.id } : {}),
      ...(input.model ? { model: input.model } : {}),
    }),
    release: () => {
      releaseSlot();
      // Settlement normally consumes the hold; releasing here covers the paths
      // that never settle at all — a handler that threw, a client that vanished
      // before the upstream answered.
      releaseShareHold(hold?.id);
    },
  };
}
