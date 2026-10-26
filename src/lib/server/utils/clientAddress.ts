/**
 * The address a request is counted against.
 *
 * The TCP peer is the only address a client cannot choose, so it is the
 * default. `X-Forwarded-For` is read only when the operator says a reverse
 * proxy stands in front of the server (`trustProxy`), and then from the right:
 * the hops of the listed proxies are skipped and the first other entry is the
 * client, because a proxy appends the address it saw and anything a client put
 * in the header itself sits further left.
 *
 * @module server/utils/clientAddress
 */

import { isIP } from "node:net";
import type { ServerClientAddressInput } from "../../types/index.js";

/** Strip an IPv4-mapped IPv6 prefix and a port, so one client has one key. */
export function canonicalAddress(address: string): string | undefined {
  let value = address.trim();
  if (value.startsWith("[")) {
    const end = value.indexOf("]");
    value = end === -1 ? value.slice(1) : value.slice(1, end);
  } else if (
    /^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(value) ||
    /^[^:]+:\d+$/.test(value)
  ) {
    value = value.slice(0, value.lastIndexOf(":"));
  }
  if (value.toLowerCase().startsWith("::ffff:") && isIP(value.slice(7)) === 4) {
    value = value.slice(7);
  }
  return isIP(value) ? value : undefined;
}

/**
 * The client's address, or `undefined` when the runtime reports no peer and
 * no trusted header names one. The result is always a bare IP, so a header
 * holding anything else cannot become a counter key.
 */
export function resolveClientAddress(
  input: ServerClientAddressInput,
): string | undefined {
  const peer = input.remoteAddress
    ? canonicalAddress(input.remoteAddress)
    : undefined;
  if (!input.trustProxy || !input.forwardedFor) {
    return peer;
  }
  const trusted = new Set(
    input.trustedProxies
      .map(canonicalAddress)
      .filter((value): value is string => value !== undefined),
  );
  const hops = input.forwardedFor
    .split(",")
    .map(canonicalAddress)
    .filter((value): value is string => value !== undefined);
  for (let index = hops.length - 1; index >= 0; index--) {
    if (!trusted.has(hops[index])) {
      return hops[index];
    }
  }
  return peer;
}

/** `true` for an address only this host can reach: 127/8, `::1`, or their mapped forms. */
export function isLoopbackAddress(address: string | undefined): boolean {
  if (!address) {
    return false;
  }
  const value = canonicalAddress(address) ?? address.trim().toLowerCase();
  return (
    value === "::1" ||
    value === "localhost" ||
    /^127\.\d+\.\d+\.\d+$/.test(value)
  );
}
