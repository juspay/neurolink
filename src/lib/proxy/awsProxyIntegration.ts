/**
 * AWS SDK Global Agent Configuration for Proxy Support
 * Configures Node.js global HTTP/HTTPS agents to work with AWS SDK
 * Ensures BedrockRuntimeClient and other AWS services respect proxy settings
 */

import type {
  HttpHandlerOptions,
  HttpRequest,
  HttpResponse,
  RequestHandler,
} from "@smithy/types";
import type { Dispatcher } from "undici";
import { logger } from "../utils/logger.js";
import { getProxyDispatcherForUrl, maskProxyUrl } from "./proxyFetch.js";
import { shouldBypassProxy } from "./utils/noProxyUtils.js";

/**
 * Configure global Node.js agents for AWS SDK proxy support
 * This ensures BedrockRuntimeClient and other AWS SDK clients respect proxy settings
 */
export async function configureAWSProxySupport(): Promise<void> {
  try {
    // Check if proxy is needed for AWS endpoints
    const testUrl = "https://bedrock-runtime.us-east-1.amazonaws.com";
    const proxyUrl = getProxyUrlForTarget(testUrl);

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
 * Characters `encodeURIComponent` leaves alone that RFC 3986 reserves. The
 * AWS SDK's own query builder escapes them too, and SigV4 canonicalises the
 * query the same way, so the wire form has to agree.
 */
function escapeUri(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

/** The request's absolute URL, built the way the SDK's own handlers build it. */
function awsRequestUrl(request: HttpRequest): string {
  const parts: string[] = [];
  for (const key of Object.keys(request.query ?? {}).sort()) {
    const value = request.query?.[key];
    const name = escapeUri(key);
    if (Array.isArray(value)) {
      for (const item of value) {
        parts.push(`${name}=${escapeUri(item)}`);
      }
    } else if (typeof value === "string") {
      parts.push(`${name}=${escapeUri(value)}`);
    } else {
      parts.push(name);
    }
  }
  const port = request.port ? `:${request.port}` : "";
  const query = parts.length > 0 ? `?${parts.join("&")}` : "";
  return `${request.protocol}//${request.hostname}${port}${request.path}${query}`;
}

/**
 * Hop-by-hop headers undici refuses or manages itself. SigV4 never signs any
 * of them, so dropping them cannot invalidate a signature.
 */
const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "expect",
  "keep-alive",
  "proxy-connection",
  "transfer-encoding",
  "upgrade",
]);

/**
 * A request handler for an AWS SDK v3 client that sends every request through
 * the HTTP(S) proxy the environment configures for `targetUrl`, or `null` when
 * none applies: no proxy variable for the endpoint's scheme, the endpoint is
 * listed in NO_PROXY, or the proxy is a SOCKS URL, which this handler cannot
 * speak. On `null` the caller passes no handler at all, so the SDK keeps its
 * default transport exactly as before.
 *
 * `targetUrl` is the endpoint the client will call. The decision is made once,
 * when the client is built, the same way `createProxyFetch` snapshots the
 * environment. Each request then takes the dispatcher for its own URL, so a
 * request the environment says to send direct still goes direct.
 *
 * The handler speaks HTTP/1.1 through undici's `ProxyAgent` (CONNECT for an
 * https endpoint). Bedrock Runtime defaults to an HTTP/2 handler, but Converse,
 * ConverseStream, InvokeModel and the SageMaker Runtime operations are all
 * served over HTTP/1.1; only bidirectional streams need HTTP/2, and nothing
 * here uses one.
 *
 * The shape is the SDK's `HttpHandler`: `handle` plus the two config hooks
 * its runtime extensions call. `@smithy/protocol-http`, which names that type,
 * is not a direct dependency, so it is spelled out from `@smithy/types`.
 */
export function createAWSProxyHandler(
  targetUrl: string,
  options: { requestTimeout?: number } = {},
):
  | (RequestHandler<HttpRequest, HttpResponse, HttpHandlerOptions> & {
      updateHttpClientConfig(key: "requestTimeout", value?: number): void;
      httpHandlerConfigs(): { requestTimeout?: number };
    })
  | null {
  const proxyUrl = getProxyUrlForTarget(targetUrl);
  if (!proxyUrl) {
    return null;
  }
  let protocol: string;
  try {
    protocol = new URL(proxyUrl).protocol;
  } catch {
    logger.warn("[AWS Proxy] Proxy URL could not be parsed; not proxying", {
      proxyUrl: maskProxyUrl(proxyUrl),
    });
    return null;
  }
  if (protocol !== "http:" && protocol !== "https:") {
    logger.warn(
      "[AWS Proxy] Only HTTP/HTTPS proxies are supported for AWS SDK clients; not proxying",
      { protocol },
    );
    return null;
  }

  logger.debug("[AWS Proxy] Routing AWS SDK requests through proxy", {
    proxyUrl: maskProxyUrl(proxyUrl),
    targetUrl,
  });

  let requestTimeout = options.requestTimeout;
  return {
    metadata: { handlerProtocol: "http/1.1" },
    async handle(request, handlerOptions) {
      const url = awsRequestUrl(request);
      const headers: Record<string, string> = {};
      for (const [name, value] of Object.entries(request.headers)) {
        if (!HOP_BY_HOP_HEADERS.has(name.toLowerCase())) {
          headers[name] = value;
        }
      }
      // A deprecated SDK-shaped signal (no addEventListener) cannot be handed
      // to undici; the SDK itself only ever passes a native one.
      const abortSignal = handlerOptions?.abortSignal;
      const signal =
        abortSignal instanceof AbortSignal ? abortSignal : undefined;
      const timeout = handlerOptions?.requestTimeout ?? requestTimeout;
      const dispatcher = await getProxyDispatcherForUrl(url);
      const { request: send } = await import("undici");
      const response = await send(url, {
        method: request.method as Dispatcher.HttpMethod,
        headers,
        body: (request.body ?? null) as Dispatcher.RequestOptions["body"],
        ...(dispatcher ? { dispatcher } : {}),
        ...(signal ? { signal } : {}),
        ...(timeout ? { headersTimeout: timeout, bodyTimeout: timeout } : {}),
      });
      const responseHeaders: Record<string, string> = {};
      for (const [name, value] of Object.entries(response.headers)) {
        if (value !== undefined) {
          responseHeaders[name] = Array.isArray(value)
            ? value.join(", ")
            : value;
        }
      }
      return {
        response: {
          statusCode: response.statusCode,
          headers: responseHeaders,
          body: response.body,
        },
      };
    },
    updateHttpClientConfig(key, value) {
      if (key === "requestTimeout") {
        requestTimeout = value;
      }
    },
    httpHandlerConfigs() {
      return { requestTimeout };
    },
  };
}

/**
 * The endpoint an AWS SDK client will call, resolved the way the SDK resolves
 * it: an explicit endpoint, then `AWS_ENDPOINT_URL_<SERVICE>`, then
 * `AWS_ENDPOINT_URL`, then the service's regional host. Used only to decide
 * whether the proxy applies (NO_PROXY is matched against this host).
 */
export function resolveAWSEndpointForProxy(params: {
  explicitEndpoint?: string;
  /** e.g. `AWS_ENDPOINT_URL_BEDROCK_RUNTIME` */
  serviceEndpointEnvVar: string;
  /** The regional host prefix, e.g. `bedrock-runtime` or `runtime.sagemaker`. */
  hostPrefix: string;
  region: string;
}): string {
  const configured =
    params.explicitEndpoint ||
    process.env[params.serviceEndpointEnvVar] ||
    process.env.AWS_ENDPOINT_URL;
  if (configured) {
    return configured;
  }
  const domain = params.region.startsWith("cn-")
    ? "amazonaws.com.cn"
    : "amazonaws.com";
  return `https://${params.hostPrefix}.${params.region}.${domain}`;
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
 * The proxy a request to `targetUrl` should use, or null. The same selection
 * `proxyFetch` makes for every other provider: NO_PROXY first, then the
 * scheme's own variable, then ALL_PROXY. An https endpoint never falls back to
 * HTTP_PROXY. SOCKS_PROXY is not consulted: an AWS SDK client cannot use it.
 */
function getProxyUrlForTarget(targetUrl: string): string | null {
  if (shouldBypassProxy(targetUrl)) {
    return null;
  }
  let protocol: string;
  try {
    protocol = new URL(targetUrl).protocol;
  } catch {
    return null;
  }
  const httpsProxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy;
  const allProxy = process.env.ALL_PROXY || process.env.all_proxy;
  if (protocol === "https:" && httpsProxy) {
    return httpsProxy;
  }
  if (protocol === "http:" && httpProxy) {
    return httpProxy;
  }
  return allProxy || null;
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
    const proxyUrl = getProxyUrlForTarget(testUrl);

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
