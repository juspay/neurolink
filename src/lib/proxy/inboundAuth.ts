/**
 * Inbound trust for the proxy listeners and the SDK-mounted proxy routes.
 *
 * Both pool engines spend the operator's subscriptions on behalf of whoever
 * reaches the port. On loopback that is the operator; anywhere else it is
 * anyone. This module holds the three decisions that keep that honest:
 *
 * - **Bind policy.** A listener may bind off-loopback only when something
 *   authenticates callers: the share gate, an inbound token, or the operator's
 *   explicit `--allow-unauthenticated`.
 * - **Inbound token.** `NEUROLINK_PROXY_INBOUND_TOKEN` (or `--inbound-token`)
 *   is a bearer every caller must present, compared in constant time. A share
 *   token is an alternative credential, judged by the share gate.
 * - **Operator-only surfaces.** `/accounts`, `/limits` and `/status` name the
 *   pool's accounts; they are refused to borrowers and, when a token is
 *   configured, to anyone without it.
 *
 * @module proxy/inboundAuth
 */

import type {
  ProxyBindPolicyDecision,
  ProxyBindPolicyInput,
  ProxyInboundAuthOptions,
  ProxyShareRefusalResponse,
} from "../types/index.js";
import { logger } from "../utils/logger.js";
import { extractShareToken } from "./shareGate.js";

/** Dedicated header, so the inbound token never collides with a client credential. */
export const INBOUND_TOKEN_HEADER = "x-neurolink-inbound-token";
/** Set on every refusal so a client can tell "token required" from "bad request". */
export const INBOUND_AUTH_HEADER = "x-neurolink-inbound-auth";
export const INBOUND_TOKEN_ENV = "NEUROLINK_PROXY_INBOUND_TOKEN";
export const ALLOW_UNAUTHENTICATED_ENV =
  "NEUROLINK_PROXY_ALLOW_UNAUTHENTICATED";

/**
 * Compare two secrets without leaking where they diverge. Hand-rolled rather
 * than `crypto.timingSafeEqual` so the proxy routes stay loadable from a build
 * whose `node:crypto` stub does not carry it.
 */
export function secretsMatch(expected: string, presented: string): boolean {
  if (expected.length !== presented.length || expected.length === 0) {
    return false;
  }
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) {
    difference |= expected.charCodeAt(index) ^ presented.charCodeAt(index);
  }
  return difference === 0;
}

function envFlagIsOn(name: string): boolean {
  const raw = (process.env[name] ?? "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "on" || raw === "yes";
}

/** The inbound token in force: an explicit value wins over the environment. */
export function resolveInboundToken(explicit?: string): string | undefined {
  const candidate = explicit?.trim() || process.env[INBOUND_TOKEN_ENV]?.trim();
  return candidate ? candidate : undefined;
}

/** `NEUROLINK_PROXY_ALLOW_UNAUTHENTICATED` as a boolean. */
export function isUnauthenticatedBindAllowedByEnv(): boolean {
  return envFlagIsOn(ALLOW_UNAUTHENTICATED_ENV);
}

/** Loopback addresses in every spelling a bind flag accepts. */
export function isLoopbackHost(host: string): boolean {
  const trimmed = host
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, "");
  if (trimmed === "localhost" || trimmed === "::1") {
    return true;
  }
  if (/^0{1,4}(:0{1,4}){6}:0{0,3}1$/.test(trimmed)) {
    return true;
  }
  if (trimmed.startsWith("::ffff:")) {
    return isLoopbackHost(trimmed.slice("::ffff:".length));
  }
  const octets = trimmed.split(".");
  return (
    octets.length === 4 &&
    octets[0] === "127" &&
    octets.every((octet) => /^\d{1,3}$/.test(octet) && Number(octet) <= 255)
  );
}

/**
 * May the proxy bind to `host`?
 *
 * Loopback always may. Anything else needs the share gate, an inbound token,
 * or the operator's explicit acknowledgement — and the acknowledgement still
 * earns a warning, because the subscriptions are then one port scan away.
 */
export function evaluateProxyBindPolicy(
  input: ProxyBindPolicyInput,
): ProxyBindPolicyDecision {
  if (isLoopbackHost(input.host)) {
    return { allowed: true };
  }
  if (input.inboundToken || input.requireGrant) {
    return { allowed: true };
  }
  if (input.allowUnauthenticated) {
    return {
      allowed: true,
      warning:
        `Binding ${input.host} with no inbound authentication: anyone who reaches ` +
        `this port can spend every pooled subscription. --allow-unauthenticated ` +
        `acknowledges that; put an authenticating reverse proxy in front.`,
    };
  }
  return {
    allowed: false,
    reason:
      `Refusing to bind ${input.host}: it is not a loopback address and nothing ` +
      `would authenticate inbound callers. Set ${INBOUND_TOKEN_ENV} (or pass ` +
      `--inbound-token <secret>), gate the port with NEUROLINK_PROXY_REQUIRE_GRANT=1, ` +
      `or pass --allow-unauthenticated to accept an open proxy.`,
  };
}

function presentedInboundToken(
  headers: Record<string, string | undefined>,
): string | undefined {
  const dedicated = headers[INBOUND_TOKEN_HEADER];
  if (dedicated?.trim()) {
    return dedicated.trim();
  }
  const authorization = headers.authorization ?? headers.Authorization;
  if (!authorization) {
    return undefined;
  }
  const trimmed = authorization.trim();
  return trimmed.toLowerCase().startsWith("bearer ")
    ? trimmed.slice("bearer ".length).trim()
    : undefined;
}

/** True when the request presents the configured inbound token. */
export function hasValidInboundToken(
  headers: Record<string, string | undefined>,
  token: string | undefined,
): boolean {
  if (!token) {
    return false;
  }
  const presented = presentedInboundToken(headers);
  return presented !== undefined && secretsMatch(token, presented);
}

/** The 401 an unauthenticated caller receives, in the Anthropic error shape. */
export function buildInboundAuthRefusal(): ProxyShareRefusalResponse {
  return {
    status: 401,
    headers: { [INBOUND_AUTH_HEADER]: "required" },
    body: {
      type: "error",
      error: {
        type: "authentication_error",
        message:
          "This proxy requires an inbound token. Send it as " +
          `${INBOUND_TOKEN_HEADER} or as Authorization: Bearer <token>.`,
      },
    },
  };
}

/**
 * Decide an inbound request against the configured token.
 *
 * A request carrying a share token is handed to the share gate instead: a
 * borrower holds a grant, not the operator's token, and the gate is what
 * judges a grant. Everything else must present the token.
 */
export function authorizeInboundRequest(
  headers: Record<string, string | undefined>,
  token: string | undefined,
): { ok: true } | { ok: false; response: ProxyShareRefusalResponse } {
  if (!token) {
    return { ok: true };
  }
  if (hasValidInboundToken(headers, token)) {
    return { ok: true };
  }
  if (extractShareToken(headers) !== undefined) {
    return { ok: true };
  }
  return { ok: false, response: buildInboundAuthRefusal() };
}

/** `Response` form of the refusal, for route factories whose adapters pass one through. */
export function inboundAuthRefusalResponse(): Response {
  const refusal = buildInboundAuthRefusal();
  return new Response(JSON.stringify(refusal.body), {
    status: refusal.status,
    headers: { "content-type": "application/json", ...refusal.headers },
  });
}

const warnedEngines = new Set<string>();

/**
 * Say, loudly and once per engine, that a proxy route group was mounted with
 * nothing authenticating its callers. `logger.always` on purpose: the ordinary
 * warn level is invisible outside debug runs, and an open proxy is exactly the
 * thing an operator must not be able to miss. Suppressed when the caller
 * recorded the decision (`allowUnauthenticated`), which the CLI does after its
 * own bind check.
 */
export function warnIfProxyRoutesUnauthenticated(
  engine: string,
  options: ProxyInboundAuthOptions | undefined,
  token: string | undefined,
): void {
  if (token || options?.allowUnauthenticated || warnedEngines.has(engine)) {
    return;
  }
  warnedEngines.add(engine);
  logger.always(
    `[proxy] SECURITY: the ${engine} proxy routes were mounted with no inbound ` +
      `authentication. Anyone who can reach them spends the pooled subscriptions. ` +
      `Set ${INBOUND_TOKEN_ENV}, pass inboundAuth.token, or bind loopback only ` +
      `and set inboundAuth.allowUnauthenticated to acknowledge this.`,
  );
}

/** Test isolation only. */
export function resetInboundAuthWarningsForTests(): void {
  warnedEngines.clear();
}

/** Paths that stay open on an authenticated listener: liveness and self-authenticating peers. */
export function isInboundAuthExemptPath(path: string): boolean {
  return (
    path === "/health" ||
    path === "/internal/update-control" ||
    path.startsWith("/peer/")
  );
}

/**
 * How many pooled accounts one inbound request may be tried against.
 *
 * Without a cap a single request fans out to every account in the pool — N
 * upstream posts, N× quota — on any rotation trigger. Default 3;
 * `NEUROLINK_PROXY_MAX_ACCOUNTS_PER_REQUEST=0` restores the unbounded
 * behaviour.
 */
export const MAX_ACCOUNTS_PER_REQUEST_ENV =
  "NEUROLINK_PROXY_MAX_ACCOUNTS_PER_REQUEST";
export const DEFAULT_MAX_ACCOUNTS_PER_REQUEST = 3;

export function resolveMaxAccountsPerRequest(): number {
  const raw = process.env[MAX_ACCOUNTS_PER_REQUEST_ENV]?.trim();
  if (raw === undefined || raw === "") {
    return DEFAULT_MAX_ACCOUNTS_PER_REQUEST;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return DEFAULT_MAX_ACCOUNTS_PER_REQUEST;
  }
  return parsed === 0 ? Number.POSITIVE_INFINITY : Math.floor(parsed);
}
