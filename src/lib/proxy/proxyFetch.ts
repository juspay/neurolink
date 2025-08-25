/**
 * Proxy-aware fetch implementation for AI SDK providers
 * Implements the proven Vercel AI SDK proxy pattern using undici
 */

import { logger } from "../utils/logger.js";

/**
 * Create a proxy-aware fetch function
 * This implements the community-validated approach for Vercel AI SDK
 */
export function createProxyFetch(): typeof fetch {
  const httpsProxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy;

  // If no proxy configured, return standard fetch
  if (!httpsProxy && !httpProxy) {
    logger.debug(
      "[Proxy Fetch] No proxy environment variables found - using standard fetch",
    );
    return fetch;
  }

  logger.debug(`[Proxy Fetch] Configuring proxy with undici ProxyAgent`);
  logger.debug(`[Proxy Fetch] HTTP_PROXY: ${httpProxy || "not set"}`);
  logger.debug(`[Proxy Fetch] HTTPS_PROXY: ${httpsProxy || "not set"}`);

  // Return proxy-aware fetch function
  return async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    try {
      // Dynamic import undici to avoid build issues
      const undici = await import("undici");
      const { ProxyAgent } = undici;

      const url =
        typeof input === "string"
          ? new URL(input)
          : input instanceof URL
            ? input
            : new URL(input.url);
      const proxyUrl = url.protocol === "https:" ? httpsProxy : httpProxy;

      if (proxyUrl) {
        logger.debug(
          `[Proxy Fetch] Creating ProxyAgent for ${url.hostname} via ${proxyUrl}`,
        );

        // Create ProxyAgent
        const dispatcher = new ProxyAgent(proxyUrl);

        // Use undici fetch with dispatcher
        const response = await undici.fetch(
          input as string,
          {
            ...init,
            dispatcher: dispatcher,
          } as unknown as import("undici").RequestInit,
        );

        logger.debug(
          `[Proxy Fetch] ✅ Request proxied successfully to ${url.hostname}`,
        );
        return response as unknown as Response; // undici.fetch returns compatible Response type
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.warn(
        `[Proxy Fetch] Proxy failed (${errorMessage}), falling back to direct connection`,
      );
    }

    // Fallback to standard fetch
    return fetch(input, init);
  };
}

/**
 * Get proxy status information
 */
export function getProxyStatus() {
  const httpsProxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy;
  const noProxy = process.env.NO_PROXY || process.env.no_proxy;

  return {
    enabled: !!(httpsProxy || httpProxy),
    httpProxy: httpProxy || null,
    httpsProxy: httpsProxy || null,
    noProxy: noProxy || null,
    method: "undici-proxy-agent",
  };
}
