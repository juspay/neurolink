/**
 * AWS SDK Global Agent Configuration for Proxy Support
 * Configures Node.js global HTTP/HTTPS agents to work with AWS SDK
 * Ensures BedrockRuntimeClient and other AWS services respect proxy settings
 */

import { logger } from "../utils/logger.js";

/**
 * Configure global Node.js agents for AWS SDK proxy support
 * This ensures BedrockRuntimeClient and other AWS SDK clients respect proxy settings
 */
export async function configureAWSProxySupport(): Promise<void> {
  try {
    // Check if proxy is needed for AWS endpoints
    const testUrl = "https://bedrock-runtime.us-east-1.amazonaws.com";
    const proxyUrl = await getProxyUrlForTarget(testUrl);

    if (!proxyUrl) {
      logger.debug("[AWS Proxy] No proxy configuration needed for AWS SDK");
      return;
    }

    logger.debug("[AWS Proxy] Configuring global agents for AWS SDK", {
      proxyUrl: proxyUrl.replace(/\/\/[^:]+:[^@]+@/, "//*****:*****@"),
      targetEndpoint: testUrl,
    });

    // Configure global agents
    await configureGlobalAgents(proxyUrl);

    logger.info("[AWS Proxy] AWS SDK proxy support configured successfully");
  } catch (error) {
    logger.error("[AWS Proxy] Failed to configure AWS SDK proxy support", {
      error,
    });
    // Don't throw - allow AWS SDK to work without proxy
  }
}

/**
 * Configure Node.js global HTTP/HTTPS agents
 */
async function configureGlobalAgents(proxyUrl: string): Promise<void> {
  try {
    const parsed = new URL(proxyUrl);

    logger.debug("[AWS Proxy] Configuring global agents", {
      protocol: parsed.protocol,
      hostname: parsed.hostname,
      port: parsed.port || getDefaultPort(parsed.protocol),
    });

    // For HTTP/HTTPS proxies, we need to set global agents
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      await configureHttpAgents(proxyUrl);
    } else if (parsed.protocol === "socks4:" || parsed.protocol === "socks5:") {
      await configureSocksAgents(proxyUrl);
    } else {
      throw new Error(
        `Unsupported proxy protocol for AWS SDK: ${parsed.protocol}`,
      );
    }
  } catch (error) {
    logger.error("[AWS Proxy] Failed to configure global agents", {
      proxyUrl,
      error,
    });
    throw error;
  }
}

/**
 * Configure HTTP/HTTPS proxy agents using existing proxy infrastructure
 */
async function configureHttpAgents(proxyUrl: string): Promise<void> {
  // No-op here. Prefer explicit handler injection at client construction time.
  logger.debug(
    "[AWS Proxy] Skipping global env/agent mutation; use injected HttpHandler instead",
    {
      proxyUrl: proxyUrl.replace(/\/\/[^:]+:[^@]+@/, "//*****:*****@"),
    },
  );
}

/**
 * Configure SOCKS proxy agents - simplified approach
 */
async function configureSocksAgents(proxyUrl: string): Promise<void> {
  // SOCKS via HTTP(S)_PROXY won't work; avoid setting to socks://
  // Setting HTTP_PROXY/HTTPS_PROXY to a socks:// URL is not respected by Node's https module nor by AWS SDK handlers
  logger.warn(
    "[AWS Proxy] SOCKS proxy configuration not supported for AWS SDK",
    {
      proxyUrl: proxyUrl.replace(/\/\/[^:]+:[^@]+@/, "//*****:*****@"),
      reason:
        "AWS SDK v3 does not support SOCKS proxies via environment variables",
    },
  );

  throw new Error(
    `SOCKS proxy configuration not supported for AWS SDK. Consider using HTTP/HTTPS proxy instead. ` +
      `For SOCKS support, use a proxy-aware agent injected into AWS clients.`,
  );
}

/**
 * Minimal HTTP agent configuration (fallback)
 */
async function _configureMinimalHttpAgents(_proxyUrl: string): Promise<void> {
  // Remove broken fallback. Use explicit proxy-aware HttpHandler instead.
  logger.warn(
    "[AWS Proxy] Minimal agent fallback removed; a proper proxy agent is required.",
  );
}

/**
 * Create a proxy-aware HTTP handler for AWS SDK clients
 * This is the proper way to inject proxy support into AWS SDK v3 clients
 */
export async function createAWSProxyHandler(
  targetUrl?: string,
): Promise<unknown | null> {
  try {
    const testUrl =
      targetUrl || "https://bedrock-runtime.us-east-1.amazonaws.com";
    const proxyUrl = await getProxyUrlForTarget(testUrl);

    if (!proxyUrl) {
      logger.debug(
        "[AWS Proxy] No proxy configured, using default HTTP handler",
      );
      return null;
    }

    logger.debug("[AWS Proxy] Creating proxy-aware HTTP handler for AWS SDK", {
      proxyUrl: proxyUrl.replace(/\/\/[^:]+:[^@]+@/, "//*****:*****@"),
    });

    // Dynamically import proxy agent modules
    const parsed = new URL(proxyUrl);

    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      try {
        // Use undici ProxyAgent for HTTP/HTTPS proxies
        const { ProxyAgent } = await import("undici");
        const proxyAgent = new ProxyAgent(proxyUrl);

        // Create a custom dispatcher wrapper for AWS SDK
        return {
          async handle(request: unknown) {
            const { fetch } = await import("undici");
            const req = request as {
              url: string;
              method?: string;
              headers?: Record<string, string>;
              body?: unknown;
            };
            return fetch(req.url, {
              method: req.method,
              headers: req.headers,
              body: req.body as import("undici").BodyInit,
              dispatcher: proxyAgent,
            });
          },
        };
      } catch (undiciError) {
        logger.warn("[AWS Proxy] No suitable proxy agent available", {
          undiciError:
            undiciError instanceof Error
              ? undiciError.message
              : String(undiciError),
        });
        return null;
      }
    } else {
      logger.warn("[AWS Proxy] Unsupported proxy protocol for AWS SDK", {
        protocol: parsed.protocol,
      });
      return null;
    }
  } catch (error) {
    logger.error("[AWS Proxy] Failed to create proxy-aware HTTP handler", {
      error,
    });
    return null;
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

// Import shared NO_PROXY utility
import { shouldBypassProxySimple } from "./utils/noProxyUtils.js";

/**
 * Get proxy URL for specific target (reuse existing logic)
 */
async function getProxyUrlForTarget(targetUrl: string): Promise<string | null> {
  try {
    // Simple fallback proxy detection using environment variables
    // This is more reliable than trying to import internal functions
    const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy;
    const httpsProxy = process.env.HTTPS_PROXY || process.env.https_proxy;
    const allProxy = process.env.ALL_PROXY || process.env.all_proxy;
    const noProxy = process.env.NO_PROXY || process.env.no_proxy;

    // Check if target should bypass proxy using shared utility
    if (noProxy && shouldBypassProxySimple(targetUrl, noProxy)) {
      return null;
    }

    // Use HTTPS proxy for HTTPS URLs, HTTP proxy for HTTP URLs
    const url = new URL(targetUrl);
    if (url.protocol === "https:" && (httpsProxy || allProxy)) {
      return httpsProxy || allProxy || null;
    } else if (url.protocol === "http:" && httpProxy) {
      return httpProxy;
    } else if (httpProxy) {
      // Fallback to HTTP proxy for any protocol
      return httpProxy;
    } else if (allProxy) {
      return allProxy;
    }

    return null;
  } catch (error) {
    // Fallback to simple environment variable check
    // (Ensure any logged URLs here are masked before emitting.)
    logger.warn("[AWS Proxy] Error in proxy detection, using simple fallback", {
      error: error instanceof Error ? error.message : String(error),
    });

    // Check NO_PROXY bypass first in fallback path too
    const noProxy = process.env.NO_PROXY || process.env.no_proxy;
    if (noProxy && shouldBypassProxySimple(targetUrl, noProxy)) {
      return null;
    }

    const url = new URL(targetUrl);
    const httpsProxy = process.env.HTTPS_PROXY || process.env.https_proxy;
    const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy;
    const allProxy = process.env.ALL_PROXY || process.env.all_proxy;

    if (url.protocol === "https:" && httpsProxy) {
      return httpsProxy;
    }
    if (url.protocol === "http:" && httpProxy) {
      return httpProxy;
    }
    if (allProxy) {
      return allProxy;
    }

    return null;
  }
}

/**
 * Clean up global agents (for testing or shutdown)
 */
export async function cleanupAWSProxySupport(): Promise<void> {
  try {
    const http = await import("http");
    const https = await import("https");

    // Reset to default agents
    https.globalAgent = new https.Agent();
    http.globalAgent = new http.Agent();

    logger.debug("[AWS Proxy] Global agents reset to defaults");
  } catch (error) {
    logger.warn("[AWS Proxy] Failed to cleanup global agents", { error });
  }
}

/**
 * Test AWS endpoint connectivity through proxy
 */
export async function testAWSProxyConnectivity(): Promise<boolean> {
  try {
    const testUrl = "https://bedrock-runtime.us-east-1.amazonaws.com";
    const proxyUrl = await getProxyUrlForTarget(testUrl);

    if (!proxyUrl) {
      logger.debug("[AWS Proxy] No proxy configured, direct connection test");
      return true; // No proxy needed
    }

    logger.debug("[AWS Proxy] Testing proxy connectivity to AWS", {
      testUrl,
      proxyUrl: proxyUrl.replace(/\/\/[^:]+:[^@]+@/, "//*****:*****@"),
    });

    // Simple connectivity test using fetch with AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    // Use proxy-aware fetch instead of raw fetch
    const { createProxyFetch } = await import("./proxyFetch.js");
    const proxyAwareFetch = createProxyFetch();
    const response = await proxyAwareFetch(testUrl, {
      method: "HEAD",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const success = response.status < 500; // Accept any non-5xx response
    logger.debug("[AWS Proxy] AWS proxy connectivity test", {
      success,
      status: response.status,
      statusText: response.statusText,
    });

    return success;
  } catch (error) {
    logger.warn("[AWS Proxy] AWS proxy connectivity test failed", { error });
    return false;
  }
}
