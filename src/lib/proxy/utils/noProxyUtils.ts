/**
 * Shared NO_PROXY utility functions
 * Extracted from awsProxyIntegration.ts and proxyFetch.ts to eliminate duplication
 * Supports comprehensive NO_PROXY pattern matching including wildcards, domains, ports, and CIDR
 */

import { logger } from "../../utils/logger.js";

/**
 * Check if an IP address is within a CIDR range
 */
function isIpInCIDR(ip: string, cidr: string): boolean {
  try {
    const [cidrIp, prefixLength] = cidr.split("/");
    const prefix = parseInt(prefixLength, 10);

    if (isNaN(prefix) || prefix < 0 || prefix > 32) {
      return false;
    }

    const ipToNumber = (ipStr: string): number => {
      const parts = ipStr.split(".").map(Number);
      return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
    };

    const ipNum = ipToNumber(ip);
    const cidrIpNum = ipToNumber(cidrIp);
    const mask = (-1 << (32 - prefix)) >>> 0;

    return (ipNum & mask) === (cidrIpNum & mask);
  } catch {
    return false;
  }
}

const IPV4_LITERAL = /^\d{1,3}(\.\d{1,3}){3}$/;

/**
 * The form a URL gives an IPv6 literal (`[::1]`, lower-case, compressed), so
 * `[0:0:0:0:0:0:0:1]` and `[::1]` compare equal. `null` when it is not one.
 */
function canonicalIpv6Host(address: string): string | null {
  try {
    return new URL(`http://[${address}]`).hostname;
  } catch {
    return null;
  }
}

/** A fully qualified name's trailing dot, which a URL keeps and curl ignores. */
function withoutTrailingDot(name: string): string {
  return name.endsWith(".") ? name.slice(0, -1) : name;
}

/** An entry made only of dots (`.`, `..`) names no host. */
function isDotsOnly(entry: string): boolean {
  return /^\.+$/.test(entry);
}

/**
 * curl's rules for one list entry: an optional leading `.` or `*.` is ignored;
 * the entry names that host and every subdomain of it, an IP literal only
 * itself; and a `:port` restricts it to that port. IPv6 is written bare (`::1`)
 * or bracketed (`[::1]:8080`), and only the bracketed form can carry a port.
 * One trailing dot is ignored on the entry's domain and on the URL's host name,
 * so `example.com.` and `example.com` name the same host; an entry made only of
 * dots names none.
 */
function matchesNoProxyEntry(
  entry: string,
  hostname: string,
  port: string,
): boolean {
  let host = entry;
  let entryPort: string | undefined;

  if (entry.startsWith("[")) {
    const close = entry.indexOf("]");
    if (close === -1) {
      return false;
    }
    host = entry.slice(0, close + 1);
    const rest = entry.slice(close + 1);
    if (rest !== "") {
      if (!/^:\d+$/.test(rest)) {
        return false;
      }
      entryPort = rest.slice(1);
    }
  } else {
    const colons = entry.split(":").length - 1;
    if (colons === 1) {
      const separator = entry.indexOf(":");
      host = entry.slice(0, separator);
      entryPort = entry.slice(separator + 1);
      if (!/^\d+$/.test(entryPort)) {
        return false;
      }
    } else if (colons > 1) {
      host = `[${entry}]`;
    }
  }

  if (entryPort !== undefined && entryPort !== port) {
    return false;
  }

  if (host.startsWith("[")) {
    return canonicalIpv6Host(host.slice(1, -1)) === hostname;
  }

  host = host.replace(/^(\*\.|\.)/, "");
  if (/^\.*$/.test(host) || /[\s*/]/.test(host)) {
    return false;
  }
  if (IPV4_LITERAL.test(host)) {
    return hostname === host;
  }
  const domain = withoutTrailingDot(host);
  // curl does not take "127.0.0.1." for an address, so it names nothing.
  if (IPV4_LITERAL.test(domain)) {
    return false;
  }
  const name = withoutTrailingDot(hostname);
  return name === domain || name.endsWith(`.${domain}`);
}

/**
 * The rules this function applied before it followed curl, still consulted so
 * that a configuration that bypassed the proxy through them keeps doing so.
 * That includes where they are looser than curl (`.example.com` also matches
 * `notexample.com`) and an IPv4 CIDR range such as `192.168.1.0/24`, which
 * curl-style entries do not express. They are unchanged except that an entry
 * made only of dots names no host, as in the curl-style rules.
 */
function matchesLegacyNoProxyEntry(
  lowerPattern: string,
  hostname: string,
  port: string,
): boolean {
  // Taken as a suffix, "." leaves the empty string, which every host name ends
  // with, and ".." leaves ".", which every host written with a trailing dot
  // ends with.
  if (isDotsOnly(lowerPattern)) {
    return false;
  }

  // Domain suffix match (.example.com)
  if (lowerPattern.startsWith(".")) {
    const suffix = lowerPattern.slice(1);
    return hostname.endsWith(suffix) || hostname === suffix;
  }

  // Port-specific match (hostname:port)
  if (lowerPattern.includes(":")) {
    const [patternHost, patternPort] = lowerPattern.split(":");
    return hostname === patternHost && port === patternPort;
  }

  // CIDR notation (192.168.1.0/24) - only for IP addresses
  if (lowerPattern.includes("/")) {
    // Only apply CIDR when target is an IP literal
    return IPV4_LITERAL.test(hostname) && isIpInCIDR(hostname, lowerPattern);
  }

  // Exact hostname match
  return hostname === lowerPattern;
}

/**
 * NO_PROXY bypass check. The value is a comma- or space-separated list; each
 * entry is matched case-insensitively.
 *
 * Supported entries:
 * - "*" - bypass all requests
 * - "example.com", ".example.com", "*.example.com" - the host and any subdomain
 * - "example.com:8443" - the same, on that port only; a URL without a port is
 *   on the scheme's default (80 for http, 443 for https)
 * - "example.com." - the same as "example.com": one trailing dot is ignored on
 *   an entry and on the URL's host name, so "https://api.example.com./" matches
 * - "192.168.1.10", "::1", "[::1]:8080" - an IP literal, exactly
 * - "192.168.1.0/24" - an IPv4 CIDR range, for IPv4 literal targets (IPv6 CIDR
 *   ranges are not supported)
 * - "." and ".." - an entry made only of dots names no host, so it matches
 *   nothing, as in curl
 *
 * @param targetUrl - The URL to check for proxy bypass
 * @param noProxyEnv - Optional NO_PROXY environment variable value (if not provided, reads from process.env)
 * @returns true if the URL should bypass proxy, false otherwise
 */
export function shouldBypassProxy(
  targetUrl: string,
  noProxyEnv?: string,
): boolean {
  const noProxy = noProxyEnv || process.env.NO_PROXY || process.env.no_proxy;
  if (!noProxy) {
    return false;
  }

  try {
    const url = new URL(targetUrl);
    const hostname = url.hostname.toLowerCase();
    const port = url.port || (url.protocol === "https:" ? "443" : "80");

    const patterns = noProxy
      .split(/[,\s]+/)
      .map((p) => p.trim())
      .filter(Boolean);

    for (const pattern of patterns) {
      const lowerPattern = pattern.toLowerCase();

      // Wildcard match - bypass all
      if (lowerPattern === "*") {
        return true;
      }

      if (
        matchesNoProxyEntry(lowerPattern, hostname, port) ||
        matchesLegacyNoProxyEntry(lowerPattern, hostname, port)
      ) {
        return true;
      }
    }

    return false;
  } catch (error) {
    logger.warn("[Proxy] Error in NO_PROXY bypass logic", { targetUrl, error });
    return false;
  }
}

/**
 * Get the current NO_PROXY environment variable value
 * Checks both uppercase and lowercase variants
 */
export function getNoProxyEnv(): string | undefined {
  return process.env.NO_PROXY || process.env.no_proxy;
}

/**
 * Simple NO_PROXY bypass check with basic pattern support
 * Legacy function for backward compatibility with simpler use cases
 *
 * Supports:
 * - "*" - bypass all
 * - "example.com" - exact match
 * - ".example.com" - domain suffix match
 *
 * An entry made only of dots names no host and matches nothing.
 *
 * @param targetUrl - The URL to check
 * @param noProxyValue - The NO_PROXY value to check against
 * @returns true if should bypass proxy
 */
export function shouldBypassProxySimple(
  targetUrl: string,
  noProxyValue: string,
): boolean {
  try {
    const url = new URL(targetUrl);
    const hostname = url.hostname.toLowerCase();

    // Split NO_PROXY by comma and check each pattern
    const patterns = noProxyValue.split(",").map((p) => p.trim().toLowerCase());

    for (const pattern of patterns) {
      if (!pattern) {
        continue;
      }

      // As a suffix, "." would match every host written with a trailing dot.
      if (isDotsOnly(pattern)) {
        continue;
      }

      // Exact match
      if (hostname === pattern) {
        return true;
      }

      // Wildcard match (starts with .)
      if (pattern.startsWith(".") && hostname.endsWith(pattern)) {
        return true;
      }

      // Simple wildcard
      if (pattern === "*") {
        return true;
      }
    }

    return false;
  } catch (error) {
    logger.warn("[Proxy] Error in simple NO_PROXY bypass logic", {
      targetUrl,
      error,
    });
    return false;
  }
}
