/**
 * Error codes that indicate a transient transport failure (dropped
 * connection, socket reset, connect timeout) rather than a permanent
 * misconfiguration. Shared between `proxy/proxyFetch.ts` (retry gating) and
 * `utils/errorClassifier.ts` (NetworkError classification) so both stay in
 * sync — a second hand-maintained copy would drift the two apart the same
 * way the "5xx literal text vs statusCode" split did.
 *
 * undici's native `fetch()` wraps the real transport failure in
 * `TypeError: fetch failed`, with the actionable code on `error.cause`
 * (sometimes nested another level deep, e.g. a SocketError inside a
 * ConnectTimeoutError) — never on the outer TypeError itself.
 */
export const TRANSIENT_NETWORK_CODES: ReadonlySet<string> = new Set([
  "ECONNRESET",
  "ETIMEDOUT",
  "ECONNREFUSED",
  "EPIPE",
  "UND_ERR_SOCKET",
  "UND_ERR_CONNECT_TIMEOUT",
]);
