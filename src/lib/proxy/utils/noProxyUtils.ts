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

/**
 * Comprehensive NO_PROXY bypass check supporting multiple pattern types
 *
 * Supported patterns:
 * - "*" - bypass all requests
 * - "example.com" - exact hostname match
 * - ".example.com" - domain suffix match (matches example.com and subdomains)
 * - "localhost:8080" - hostname with specific port
 * - "192.168.1.0/24" - CIDR notation for IP ranges
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
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);

    for (const pattern of patterns) {
      const lowerPattern = pattern.toLowerCase();

      // Wildcard match - bypass all
      if (lowerPattern === "*") {
        return true;
      }

      // Domain suffix match (.example.com)
      if (lowerPattern.startsWith(".")) {
        const suffix = lowerPattern.slice(1);
        if (hostname.endsWith(suffix) || hostname === suffix) {
          return true;
        }
      }

      // Port-specific match (hostname:port)
      else if (lowerPattern.includes(":")) {
        const [patternHost, patternPort] = lowerPattern.split(":");
        if (hostname === patternHost && port === patternPort) {
          return true;
        }
      }

      // CIDR notation (192.168.1.0/24) - only for IP addresses
      else if (lowerPattern.includes("/")) {
        // Only apply CIDR when target is an IP literal
        if (
          /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) &&
          isIpInCIDR(hostname, lowerPattern)
        ) {
          return true;
        }
      }

      // Exact hostname match
      else if (hostname === lowerPattern) {
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
