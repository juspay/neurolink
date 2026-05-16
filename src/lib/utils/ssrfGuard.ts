/**
 * SSRF Guard — Safe URL Validation Utility
 *
 * Prevents Server-Side Request Forgery by:
 *  1. Enforcing HTTPS-only (no plain HTTP).
 *  2. Normalising encoded IPv4 forms (octal, hex, decimal integer, IPv4-mapped IPv6)
 *     to canonical dotted-decimal before rangechecking.
 *  3. Resolving the hostname for **both** A and AAAA families and rejecting
 *     requests to RFC 1918 private ranges, loopback, link-local, CGNAT,
 *     IPv6 link-local/ULA, and cloud metadata endpoints
 *     (AWS / GCP / Azure / Alibaba).
 *  4. Re-throwing on DNS failure rather than silently allowing the request.
 *
 * **DNS rebinding residual race:** `assertSafeUrl` validates the IP at the
 * moment of the lookup. If the resolver returns a public IP here and a private
 * IP at the actual `fetch()` call, the guard is bypassed. To eliminate the
 * race, use the companion `safeDownload` helper in `safeFetch.ts` which pins
 * the resolved IP onto the request via an undici Agent dispatcher.
 *
 * Usage:
 *   await assertSafeUrl(url);
 *   // ... or, for actual downloads: ...
 *   await safeDownload(url, { maxBytes, label });
 *
 * @module utils/ssrfGuard
 */

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * Blocked IPv4 CIDRs.
 *
 * Each entry is a `[network, prefix]` pair. Membership is computed by
 * bitwise comparison of the 32-bit address vs the masked network.
 */
const BLOCKED_V4_CIDRS: Array<[string, number]> = [
  ["0.0.0.0", 8], // "this network"
  ["10.0.0.0", 8], // RFC 1918
  ["100.64.0.0", 10], // CGNAT (RFC 6598)
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local (AWS/GCP/Azure metadata + APIPA)
  ["172.16.0.0", 12], // RFC 1918
  ["192.0.0.0", 24], // protocol assignments
  ["192.168.0.0", 16], // RFC 1918
  ["198.18.0.0", 15], // benchmarking
  ["100.100.100.200", 32], // Alibaba Cloud metadata (NOT in 100.64/10 CGNAT)
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved
];

/**
 * Blocked IPv6 prefixes.
 *
 * Compared by lowercase prefix match on the expanded address form.
 * (`expandIPv6` normalizes `::1` to `0000:0000:...:0001` for unambiguous
 * prefix matching.)
 */
const BLOCKED_V6_PREFIXES: string[] = [
  "0000:0000:0000:0000:0000:0000:0000:0000", // :: (unspecified)
  "0000:0000:0000:0000:0000:0000:0000:0001", // ::1 (loopback)
  "fc", // fc00::/7 unique-local (covers fc and fd prefixes)
  "fd", // fd00::/8
  "fe8", // fe80::/10 link-local (covers fe8/fe9/fea/feb)
  "fe9",
  "fea",
  "feb",
];

function parseOctet(s: string): number | null {
  if (s.length === 0) {
    return null;
  }
  if (/^0x[0-9a-f]+$/i.test(s)) {
    return parseInt(s.slice(2), 16);
  }
  // Plain "0" is valid decimal zero; leading-zero forms (`0177`) are octal
  if (s.length > 1 && s.startsWith("0") && /^0[0-7]+$/.test(s)) {
    return parseInt(s.slice(1), 8);
  }
  if (/^\d+$/.test(s)) {
    return parseInt(s, 10);
  }
  return null;
}

/**
 * Normalize any IPv4-like host string to canonical dotted-decimal form, or
 * return `null` if it's not parseable as IPv4.
 *
 * Handles:
 *   - 127.0.0.1            (canonical)
 *   - 0177.0.0.1           (octal octets)
 *   - 0x7f.0.0.1           (hex octets)
 *   - 0x7f000001           (hex integer)
 *   - 2130706433           (decimal integer)
 *   - 0177.0.0.1           (mixed encodings)
 */
function normalizeIPv4(host: string): string | null {
  if (host.length === 0) {
    return null;
  }
  const parts = host.split(".");
  if (parts.length === 4) {
    const octets = parts.map(parseOctet);
    if (octets.some((o) => o === null || o < 0 || o > 255)) {
      return null;
    }
    return octets.join(".");
  }
  // Single integer form: 2130706433 or 0x7f000001
  if (parts.length === 1) {
    let n: number;
    if (/^0x[0-9a-f]+$/i.test(host)) {
      n = parseInt(host.slice(2), 16);
    } else if (/^\d+$/.test(host)) {
      n = parseInt(host, 10);
    } else {
      return null;
    }
    if (Number.isNaN(n) || n < 0 || n > 0xffffffff) {
      return null;
    }
    return [
      (n >>> 24) & 0xff,
      (n >>> 16) & 0xff,
      (n >>> 8) & 0xff,
      n & 0xff,
    ].join(".");
  }
  return null;
}

/**
 * Expand a compressed IPv6 address (`::1`) to full 8-group form
 * (`0000:0000:0000:0000:0000:0000:0000:0001`) for unambiguous prefix matching.
 *
 * Returns the expanded lowercased string, or `null` if `host` isn't IPv6.
 */
function expandIPv6(host: string): string | null {
  if (isIP(host) !== 6) {
    return null;
  }
  // Handle IPv4-mapped IPv6: ::ffff:127.0.0.1 → expand the IPv4 part to two groups
  const v4MappedMatch = host.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  let groups: string[];
  if (v4MappedMatch) {
    const v4 = normalizeIPv4(v4MappedMatch[1]);
    if (!v4) {
      return null;
    }
    const v4Octets = v4.split(".").map((n) => parseInt(n, 10));
    const high = ((v4Octets[0] << 8) | v4Octets[1]).toString(16);
    const low = ((v4Octets[2] << 8) | v4Octets[3]).toString(16);
    groups = ["0", "0", "0", "0", "0", "ffff", high, low];
  } else {
    const [head, tail = ""] = host.split("::");
    const headParts = head ? head.split(":") : [];
    const tailParts = tail ? tail.split(":") : [];
    const missing = 8 - headParts.length - tailParts.length;
    if (missing < 0) {
      return null;
    }
    groups = [...headParts, ...Array(missing).fill("0"), ...tailParts];
  }
  if (groups.length !== 8) {
    return null;
  }
  return groups.map((g) => g.toLowerCase().padStart(4, "0")).join(":");
}

/**
 * If `host` is an IPv4-mapped IPv6 address, return the embedded IPv4 in
 * canonical dotted-decimal form, or `null` otherwise.
 *
 * Handles both forms:
 *   - dotted-decimal IPv4 part: `::ffff:127.0.0.1`
 *   - hex-encoded IPv4 part:    `::ffff:7f00:1` / `::ffff:7f00:0001`
 *
 * Node's `URL` parser normalises bracketed `::ffff:127.0.0.1` to
 * `[::ffff:7f00:1]`, so the hex form is the one we actually receive after
 * `URL.hostname` + bracket stripping. Both paths must be covered.
 */
function extractIPv4FromMapped(host: string): string | null {
  // Form 1: `::ffff:127.0.0.1`
  const dottedMatch = host.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (dottedMatch) {
    return normalizeIPv4(dottedMatch[1]);
  }
  // Form 2: `::ffff:7f00:1` (two hex groups, optionally zero-padded)
  const hexMatch = host.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
  if (hexMatch) {
    const high = parseInt(hexMatch[1], 16);
    const low = parseInt(hexMatch[2], 16);
    if (
      Number.isNaN(high) ||
      Number.isNaN(low) ||
      high > 0xffff ||
      low > 0xffff
    ) {
      return null;
    }
    return [
      (high >> 8) & 0xff,
      high & 0xff,
      (low >> 8) & 0xff,
      low & 0xff,
    ].join(".");
  }
  return null;
}

function ipv4ToInt(ip: string): number {
  const [a, b, c, d] = ip.split(".").map((n) => parseInt(n, 10));
  return ((a << 24) | (b << 16) | (c << 8) | d) >>> 0;
}

function isBlockedIPv4(ip: string): boolean {
  const ipInt = ipv4ToInt(ip);
  for (const [network, prefix] of BLOCKED_V4_CIDRS) {
    const netInt = ipv4ToInt(network);
    const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
    if ((ipInt & mask) === (netInt & mask)) {
      return true;
    }
  }
  return false;
}

function isBlockedIPv6(expanded: string): boolean {
  return BLOCKED_V6_PREFIXES.some((prefix) => {
    if (prefix.length === 39) {
      // full-form exact match
      return expanded === prefix;
    }
    return expanded.startsWith(prefix);
  });
}

/**
 * Strip the IPv6 brackets that `URL.hostname` returns for IPv6 hosts
 * (Node behaviour varies — sometimes `[::1]`, sometimes `::1`).
 */
function stripBrackets(host: string): string {
  if (host.startsWith("[") && host.endsWith("]")) {
    return host.slice(1, -1);
  }
  return host;
}

/**
 * Internal check: given a host string (already bracket-stripped, lowercased),
 * return a reject reason or null if safe.
 *
 * Detects IP literals via every encoded form. Does NOT do DNS — that's the
 * caller's job.
 */
function checkHostLiteral(host: string): string | null {
  // IPv4 (including encoded forms)
  const v4 = normalizeIPv4(host);
  if (v4) {
    if (isBlockedIPv4(v4)) {
      return `IPv4 ${host} → ${v4} is in a blocked range`;
    }
    return null;
  }
  // IPv6 (including IPv4-mapped)
  if (host.includes(":")) {
    // First, check IPv4-mapped: convert and re-check via v4 path
    const v4FromMapped = extractIPv4FromMapped(host);
    if (v4FromMapped) {
      if (isBlockedIPv4(v4FromMapped)) {
        return `IPv4-mapped IPv6 ${host} → ${v4FromMapped} is in a blocked range`;
      }
      return null;
    }
    const expanded = expandIPv6(host);
    if (!expanded) {
      return `IPv6 ${host} could not be parsed`;
    }
    if (isBlockedIPv6(expanded)) {
      return `IPv6 ${host} is in a blocked range`;
    }
    return null;
  }
  // Not an IP literal — caller should fall through to DNS resolution
  return "not-an-ip";
}

/**
 * Assert that `url` is safe to fetch server-side.
 *
 * @throws {Error} when the URL is non-HTTPS, parses as a blocked IP literal,
 *   or resolves (A or AAAA) to a blocked IP. **Also throws on DNS lookup
 *   failure** (the previous behaviour of silently allowing was a bypass —
 *   an attacker-controlled resolver could force NXDOMAIN here and a private
 *   IP at the actual fetch).
 */
export async function assertSafeUrl(url: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid URL: "${url}"`);
  }

  if (parsed.protocol !== "https:") {
    throw new Error(
      `Only HTTPS URLs are permitted; got "${parsed.protocol}//" in "${url}"`,
    );
  }

  const host = stripBrackets(parsed.hostname).toLowerCase();

  // First, try as an IP literal (covers encoded forms + IPv4-mapped IPv6).
  const literalCheck = checkHostLiteral(host);
  if (literalCheck === null) {
    return; // routable IP literal — safe
  }
  if (literalCheck !== "not-an-ip") {
    throw new Error(`URL "${url}" rejected: ${literalCheck}`);
  }

  // Hostname — resolve BOTH A and AAAA. Reject if either family yields a
  // blocked address (closes off the "publish AAAA public, A private" attack).
  const [a, aaaa] = await Promise.allSettled([
    lookup(host, { family: 4, all: true }),
    lookup(host, { family: 6, all: true }),
  ]);

  const v4Addresses: string[] = [];
  const v6Addresses: string[] = [];
  let hadAnySuccess = false;

  if (a.status === "fulfilled") {
    hadAnySuccess = true;
    for (const entry of a.value) {
      v4Addresses.push(entry.address);
    }
  }
  if (aaaa.status === "fulfilled") {
    hadAnySuccess = true;
    for (const entry of aaaa.value) {
      v6Addresses.push(entry.address);
    }
  }

  if (!hadAnySuccess) {
    // BOTH lookups failed — the host doesn't resolve at all. Re-throw with
    // a clear message rather than silently allowing the fetch (the prior
    // behaviour, which is the DNS-rebinding bypass).
    const aErr =
      a.status === "rejected"
        ? a.reason instanceof Error
          ? a.reason.message
          : String(a.reason)
        : "ok";
    const aaaaErr =
      aaaa.status === "rejected"
        ? aaaa.reason instanceof Error
          ? aaaa.reason.message
          : String(aaaa.reason)
        : "ok";
    throw new Error(
      `URL "${url}" rejected: hostname ${host} could not be resolved (A: ${aErr}; AAAA: ${aaaaErr})`,
    );
  }

  for (const addr of v4Addresses) {
    if (isBlockedIPv4(addr)) {
      throw new Error(
        `URL "${url}" rejected: hostname ${host} resolves to ${addr} (IPv4 in blocked range)`,
      );
    }
  }
  for (const addr of v6Addresses) {
    // Re-use the literal check pipeline for IPv6 so IPv4-mapped resolved
    // addresses are caught.
    const reason = checkHostLiteral(addr.toLowerCase());
    if (reason && reason !== "not-an-ip") {
      throw new Error(
        `URL "${url}" rejected: hostname ${host} resolves to ${addr} (IPv6 ${reason})`,
      );
    }
  }
}

/**
 * Validate `url` and return the resolved IP that should be used for the
 * actual fetch (companion to `safeFetch.ts:safeDownload`).
 *
 * For IP-literal hosts, returns the normalised IP and family. For hostnames,
 * returns the first acceptable IP from the resolver. Same throw semantics as
 * {@link assertSafeUrl}.
 *
 * This is the canonical entry point for binary downloads where DNS-rebinding
 * pinning matters — see `safeFetch.ts`.
 */
export async function validateAndResolveUrl(
  url: string,
): Promise<{ url: string; ip: string; family: 4 | 6 }> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid URL: "${url}"`);
  }
  if (parsed.protocol !== "https:") {
    throw new Error(
      `Only HTTPS URLs are permitted; got "${parsed.protocol}//" in "${url}"`,
    );
  }
  const host = stripBrackets(parsed.hostname).toLowerCase();

  // IP literal — normalise + check, return canonical form
  const v4 = normalizeIPv4(host);
  if (v4) {
    if (isBlockedIPv4(v4)) {
      throw new Error(
        `URL "${url}" rejected: IPv4 ${host} → ${v4} is in a blocked range`,
      );
    }
    return { url, ip: v4, family: 4 };
  }
  if (host.includes(":")) {
    const v4FromMapped = extractIPv4FromMapped(host);
    if (v4FromMapped) {
      if (isBlockedIPv4(v4FromMapped)) {
        throw new Error(
          `URL "${url}" rejected: IPv4-mapped IPv6 ${host} → ${v4FromMapped} is in a blocked range`,
        );
      }
      return { url, ip: v4FromMapped, family: 4 };
    }
    const expanded = expandIPv6(host);
    if (!expanded) {
      throw new Error(
        `URL "${url}" rejected: IPv6 ${host} could not be parsed`,
      );
    }
    if (isBlockedIPv6(expanded)) {
      throw new Error(
        `URL "${url}" rejected: IPv6 ${host} is in a blocked range`,
      );
    }
    return { url, ip: host, family: 6 };
  }

  // Hostname — resolve and pick a safe address
  await assertSafeUrl(url);
  const result = await lookup(host);
  return { url, ip: result.address, family: result.family as 4 | 6 };
}
