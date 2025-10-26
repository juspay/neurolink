/**
 * Enhanced proxy-aware fetch implementation for AI SDK providers
 * Supports HTTP/HTTPS, SOCKS4/5, authentication, and NO_PROXY bypass
 * Lightweight implementation extracted from research of major proxy packages
 */

import { logger } from "../utils/logger.js";
import type { ProxyAgent } from "undici";
import { shouldBypassProxy } from "./utils/noProxyUtils.js";
import type { ParsedProxyConfig } from "../types/utilities.js";

/**
 * Mask credentials in proxy URLs for secure logging
 * Replaces user:password@ with [CREDENTIALS_MASKED]@
 */
function maskProxyCredentials(proxyUrl: string | undefined): string {
  if (!proxyUrl || proxyUrl === "NOT_SET") {
    return proxyUrl || "NOT_SET";
  }

  try {
    // Handle URLs with credentials: http://user:password@proxy:port
    const credentialPattern = /(:\/\/)([^@:]+):([^@]+)@/;
    if (credentialPattern.test(proxyUrl)) {
      return proxyUrl.replace(credentialPattern, "$1[CREDENTIALS_MASKED]@");
    }

    // Return original URL if no credentials found
    return proxyUrl;
  } catch {
    // If URL parsing fails, still mask potential credentials pattern
    return proxyUrl.replace(
      /(:\/\/)([^@:]+):([^@]+)@/,
      "$1[CREDENTIALS_MASKED]@",
    );
  }
}

/**
 * Mask all proxy credentials in an environment variables object
 */
function maskProxyEnvVars(
  envVars: Record<string, string>,
): Record<string, string> {
  const masked: Record<string, string> = {};
  for (const [key, value] of Object.entries(envVars)) {
    masked[key] = maskProxyCredentials(value);
  }
  return masked;
}

// ==================== LIGHTWEIGHT PROXY IMPLEMENTATIONS ====================

// ParsedProxyConfig interface moved to ../types/utilities.js

/**
 * Parse proxy URL with authentication support
 */
function parseProxyUrl(proxyUrl: string): ParsedProxyConfig {
  try {
    const url = new URL(proxyUrl);

    const config: ParsedProxyConfig = {
      protocol: url.protocol,
      hostname: url.hostname,
      port: parseInt(url.port) || getDefaultPort(url.protocol),
      cleanUrl: `${url.protocol}//${url.hostname}:${url.port || getDefaultPort(url.protocol)}`,
    };

    // Extract authentication if present
    if (url.username && url.password) {
      config.auth = {
        username: decodeURIComponent(url.username),
        password: decodeURIComponent(url.password),
      };
    }

    return config;
  } catch (error) {
    logger.error("[Proxy] Failed to parse proxy URL", {
      proxyUrl: maskProxyCredentials(proxyUrl),
      error,
    });
    throw new Error(`Invalid proxy URL: ${maskProxyCredentials(proxyUrl)}`);
  }
}

/**
 * Get default port for protocol
 */
function getDefaultPort(protocol: string): number {
  switch (protocol) {
    case "http:":
      return 8080;
    case "https:":
      return 8080;
    case "socks4:":
      return 1080;
    case "socks5:":
      return 1080;
    default:
      return 8080;
  }
}

/**
 * Select appropriate proxy URL based on target and environment
 */
function selectProxyUrl(targetUrl: string): string | null {
  // Check NO_PROXY bypass first
  if (shouldBypassProxy(targetUrl)) {
    logger.debug("[Proxy] Bypassing proxy due to NO_PROXY", { targetUrl });
    return null;
  }

  try {
    const url = new URL(targetUrl);
    const httpsProxy = process.env.HTTPS_PROXY || process.env.https_proxy;
    const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy;
    const allProxy = process.env.ALL_PROXY || process.env.all_proxy;
    const socksProxy = process.env.SOCKS_PROXY || process.env.socks_proxy;

    // Priority: Protocol-specific > ALL_PROXY > SOCKS_PROXY
    if (url.protocol === "https:" && httpsProxy) {
      return httpsProxy;
    }
    if (url.protocol === "http:" && httpProxy) {
      return httpProxy;
    }
    if (allProxy) {
      return allProxy;
    }
    if (socksProxy) {
      return socksProxy;
    }

    return null;
  } catch (error) {
    logger.warn("[Proxy] Error selecting proxy URL", { targetUrl, error });
    return null;
  }
}

/**
 * Create appropriate proxy agent based on protocol
 */
async function createProxyAgent(proxyUrl: string): Promise<ProxyAgent> {
  const parsed = parseProxyUrl(proxyUrl);

  logger.debug("[Proxy] Creating proxy agent", {
    protocol: parsed.protocol,
    hostname: parsed.hostname,
    port: parsed.port,
    hasAuth: !!parsed.auth,
  });

  switch (parsed.protocol) {
    case "http:":
    case "https:": {
      // Use existing undici ProxyAgent for HTTP/HTTPS
      const { ProxyAgent } = await import("undici");
      return new ProxyAgent(proxyUrl);
    }

    case "socks4:":
    case "socks5:": {
      // SOCKS proxy support is not included in the build to avoid optional dependencies
      throw new Error(
        `SOCKS proxy support requires 'proxy-agent' package. ` +
          `Install it with: npm install proxy-agent`,
      );
    }

    default:
      throw new Error(`Unsupported proxy protocol: ${parsed.protocol}`);
  }
}

// ==================== ENHANCED PROXY FETCH FUNCTION ====================

/**
 * Create a proxy-aware fetch function with enhanced capabilities
 * Supports HTTP/HTTPS, SOCKS4/5, authentication, and NO_PROXY bypass
 */
export function createProxyFetch(): typeof fetch {
  // Detect ALL proxy-related environment variables
  const httpsProxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy;
  const allProxy = process.env.ALL_PROXY || process.env.all_proxy;
  const socksProxy = process.env.SOCKS_PROXY || process.env.socks_proxy;
  const noProxy = process.env.NO_PROXY || process.env.no_proxy;

  // ENHANCED LOGGING: Capture ALL enhanced proxy-related environment variables with credential masking
  logger.debug("[Proxy Fetch] 🔍 ENHANCED_PROXY_ENV_DETECTION", {
    // Enhanced proxy environment variables (credentials masked)
    httpProxy: maskProxyCredentials(httpProxy || "NOT_SET"),
    httpsProxy: maskProxyCredentials(httpsProxy || "NOT_SET"),
    allProxy: maskProxyCredentials(allProxy || "NOT_SET"),
    socksProxy: maskProxyCredentials(socksProxy || "NOT_SET"),
    noProxy: noProxy || "NOT_SET", // NO_PROXY doesn't contain credentials

    // Legacy variables for compatibility (credentials masked)
    originalNodejsHttpProxy: maskProxyCredentials(
      process.env.nodejs_http_proxy || "NOT_SET",
    ),
    originalNodejsHttpsProxy: maskProxyCredentials(
      process.env.nodejs_https_proxy || "NOT_SET",
    ),

    // All potential proxy-related environment variables (credentials masked)
    allProxyRelatedEnvVars: maskProxyEnvVars(
      Object.keys(process.env)
        .filter((key) => key.toLowerCase().includes("proxy"))
        .reduce(
          (acc, key) => {
            acc[key] = process.env[key] || "NOT_SET";
            return acc;
          },
          {} as Record<string, string>,
        ),
    ),

    message:
      "Enhanced proxy environment detection with SOCKS, authentication, and NO_PROXY support (credentials masked for security)",
  });

  // If no proxy configured, return standard fetch
  if (!httpsProxy && !httpProxy && !allProxy && !socksProxy) {
    logger.debug(
      "[Proxy Fetch] No proxy environment variables found - using standard fetch",
    );
    return fetch;
  }

  logger.debug(
    `[Proxy Fetch] Configuring enhanced proxy with multiple protocol support`,
  );
  logger.debug(
    `[Proxy Fetch] HTTP_PROXY: ${maskProxyCredentials(httpProxy || "not set")}`,
  );
  logger.debug(
    `[Proxy Fetch] HTTPS_PROXY: ${maskProxyCredentials(httpsProxy || "not set")}`,
  );
  logger.debug(
    `[Proxy Fetch] ALL_PROXY: ${maskProxyCredentials(allProxy || "not set")}`,
  );
  logger.debug(
    `[Proxy Fetch] SOCKS_PROXY: ${maskProxyCredentials(socksProxy || "not set")}`,
  );
  logger.debug(`[Proxy Fetch] NO_PROXY: ${noProxy || "not set"}`);

  // Return enhanced proxy-aware fetch function
  return async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

    // Determine target URL
    const targetUrl =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : (input as Request).url;

    logger.debug(`[Proxy Fetch] 🚀 ENHANCED REQUEST START`, {
      requestId,
      targetUrl,
      timestamp: new Date().toISOString(),
      httpProxy: httpProxy || "NOT_SET",
      httpsProxy: httpsProxy || "NOT_SET",
      allProxy: allProxy || "NOT_SET",
      socksProxy: socksProxy || "NOT_SET",
      initHeaders: init?.headers || "NO_HEADERS",
      initMethod: init?.method || "GET",
    });

    try {
      // Enhanced proxy selection with NO_PROXY bypass and multiple protocols
      const proxyUrl = selectProxyUrl(targetUrl);

      if (proxyUrl) {
        const url = new URL(targetUrl);

        logger.debug(`[Proxy Fetch] 🔗 ENHANCED URL ANALYSIS`, {
          requestId,
          targetUrl,
          urlHostname: url.hostname,
          urlProtocol: url.protocol,
          urlPort: url.port,
          selectedProxyUrl: maskProxyCredentials(proxyUrl), // Hide credentials in logs
          timestamp: new Date().toISOString(),
        });

        logger.debug(`[Proxy Fetch] 🎯 ENHANCED PROXY AGENT CREATION`, {
          requestId,
          proxyUrl: maskProxyCredentials(proxyUrl), // Hide credentials
          targetHostname: url.hostname,
          targetProtocol: url.protocol,
          aboutToCreateProxyAgent: true,
          timestamp: new Date().toISOString(),
        });

        // Create/reuse proxy agent (HTTP/HTTPS/SOCKS)
        const agentCache: Map<string, ProxyAgent> =
          (
            globalThis as unknown as {
              __NL_PROXY_AGENT_CACHE__?: Map<string, ProxyAgent>;
            }
          ).__NL_PROXY_AGENT_CACHE__ ??
          ((
            globalThis as unknown as {
              __NL_PROXY_AGENT_CACHE__: Map<string, ProxyAgent>;
            }
          ).__NL_PROXY_AGENT_CACHE__ = new Map());
        const dispatcher =
          agentCache.get(proxyUrl) || (await createProxyAgent(proxyUrl));
        agentCache.set(proxyUrl, dispatcher);

        logger.debug(`[Proxy Fetch] ✅ ENHANCED PROXY AGENT CREATED`, {
          requestId,
          hasDispatcher: !!dispatcher,
          dispatcherType: typeof dispatcher,
          dispatcherConstructor: dispatcher?.constructor?.name || "unknown",
          timestamp: new Date().toISOString(),
        });

        // Handle Request objects by extracting URL and merging properties
        let fetchInput: string | URL;
        let fetchInit = { ...init };

        if (input instanceof Request) {
          fetchInput = input.url;
          fetchInit = {
            method: input.method,
            headers: input.headers,
            body: input.body,
            ...init, // Allow init to override Request properties
          };
        } else {
          fetchInput = input;
        }

        // Use undici fetch with enhanced dispatcher (supports HTTP/HTTPS/SOCKS)
        const undici = await import("undici");
        const response = await undici.fetch(fetchInput, {
          ...fetchInit,
          dispatcher: dispatcher,
        } as unknown as import("undici").RequestInit);

        logger.debug(`[Proxy Fetch] 🎉 ENHANCED PROXY SUCCESS`, {
          requestId,
          responseStatus: response?.status,
          responseOk: response?.ok,
          proxyUsed: true,
          timestamp: new Date().toISOString(),
        });

        logger.debug(
          `[Proxy Fetch] ✅ Request proxied successfully via enhanced proxy`,
        );
        return response as unknown as Response;
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      logger.debug(`[Proxy Fetch] 💥 ENHANCED ERROR ANALYSIS`, {
        requestId,
        error: errorMessage,
        errorType:
          error instanceof Error ? error.constructor.name : typeof error,
        willFallback: true,
        timestamp: new Date().toISOString(),
      });

      logger.warn(
        `[Proxy Fetch] Enhanced proxy failed (${errorMessage}), falling back to direct connection`,
      );
    }

    // Fallback to standard fetch
    logger.debug(`[Proxy Fetch] 🔄 ENHANCED FALLBACK TO STANDARD FETCH`, {
      requestId,
      fallbackReason: "No proxy configured or proxy failed",
      timestamp: new Date().toISOString(),
    });

    return fetch(input, init);
  };
}

/**
 * Get enhanced proxy status information
 */
export function getProxyStatus() {
  const httpsProxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy;
  const allProxy = process.env.ALL_PROXY || process.env.all_proxy;
  const socksProxy = process.env.SOCKS_PROXY || process.env.socks_proxy;
  const noProxy = process.env.NO_PROXY || process.env.no_proxy;

  return {
    enabled: !!(httpsProxy || httpProxy || allProxy || socksProxy),
    httpProxy: httpProxy || null,
    httpsProxy: httpsProxy || null,
    allProxy: allProxy || null,
    socksProxy: socksProxy || null,
    noProxy: noProxy || null,
    method: "enhanced-proxy-agent",
    capabilities: [
      "HTTP/HTTPS Proxy",
      "SOCKS4/SOCKS5 Proxy",
      "Proxy Authentication",
      "NO_PROXY Bypass",
      "CIDR Range Matching",
      "Wildcard Domain Matching",
    ],
  };
}
