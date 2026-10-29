/**
 * Route Builders
 * Pre-built route definitions for common NeuroLink endpoints
 */

import type {
  CreateRoutesOptions,
  ProxyInboundAuthOptions,
  RouteDefinition,
  RouteGroup,
  ServerSensitiveRouteOptions,
} from "../../types/index.js";
import { createAgentRoutes } from "./agentRoutes.js";
import { createClaudeProxyRoutes } from "./claudeProxyRoutes.js";
// ClaudeProxyDeps removed
import { createGeminiProxyRoutes } from "./geminiProxyRoutes.js";
import { createHealthRoutes } from "./healthRoutes.js";
import { createOpenAIProxyRoutes } from "./openaiProxyRoutes.js";
import { createCodexProxyRoutes } from "./codexProxyRoutes.js";
import { createMCPRoutes } from "./mcpRoutes.js";
import { createMemoryRoutes } from "./memoryRoutes.js";
import { createOpenApiRoutes } from "./openApiRoutes.js";
import { createToolRoutes } from "./toolRoutes.js";
import { createTranscribeRoutes } from "./transcribeRoutes.js";

// Re-export route builders from individual files
export { createAgentRoutes } from "./agentRoutes.js";
export { createClaudeProxyRoutes } from "./claudeProxyRoutes.js";
// ClaudeProxyDeps removed
export { createHealthRoutes } from "./healthRoutes.js";
export { createOpenAIProxyRoutes } from "./openaiProxyRoutes.js";
export { createCodexProxyRoutes } from "./codexProxyRoutes.js";
export { createGeminiProxyRoutes } from "./geminiProxyRoutes.js";
export { createMCPRoutes } from "./mcpRoutes.js";
export { createMemoryRoutes } from "./memoryRoutes.js";
export { createOpenApiRoutes } from "./openApiRoutes.js";
export { createToolRoutes } from "./toolRoutes.js";
export { createTranscribeRoutes } from "./transcribeRoutes.js";

/**
 * Create all standard routes
 * Convenience method that combines all route groups
 *
 * NOTE on the Codex outbound fallback's `anthropic` target: this function
 * does not thread `loopbackPort`/`internalDispatch` into
 * `createCodexProxyRoutes`, so that target cannot dispatch when the feature
 * is enabled through `options.runtimeConfigProvider` here — only the CLI
 * proxy command wires the in-process loopback directly. Route creation logs
 * one warning when this gap applies; see `CreateRoutesOptions.runtimeConfigProvider`
 * and docs/features/codex-proxy-support.md.
 */
export function createAllRoutes(
  basePath: string = "/api",
  options?: CreateRoutesOptions,
): RouteGroup[] {
  // The tool and MCP execution routes act on the host. They refuse callers
  // the server has not authenticated, when they can tell: registerAllRoutes()
  // tells them through `hasAuthentication`; an explicit opt-out, by option or
  // by NEUROLINK_SERVER_ALLOW_UNAUTHENTICATED=1, opens them regardless.
  const sensitive: ServerSensitiveRouteOptions = {
    allowUnauthenticated:
      options?.allowUnauthenticated === true || allowUnauthenticatedFromEnv(),
    hasAuthentication: options?.hasAuthentication,
  };
  // The proxy doors spend pooled subscriptions; their inbound token defaults to
  // NEUROLINK_PROXY_INBOUND_TOKEN and the factories warn loudly without one.
  const proxyAuth: ProxyInboundAuthOptions = {
    ...options?.proxyAuth,
    allowUnauthenticated:
      options?.proxyAuth?.allowUnauthenticated ??
      options?.allowUnauthenticated === true,
  };
  const routes: RouteGroup[] = [
    createAgentRoutes(basePath, {
      ...options?.agent,
      perUserAuth: options?.perUserAuth,
    }),
    ...(options?.tools === false
      ? []
      : [createToolRoutes(basePath, sensitive)]),
    createMCPRoutes(basePath, sensitive),
    createMemoryRoutes(basePath, {
      ...options?.memory,
      perUserAuth: options?.perUserAuth,
    }),
    createHealthRoutes(basePath),
    createTranscribeRoutes(basePath, options?.transcribe),
  ];

  // Conditionally add OpenAPI/Swagger routes
  if (options?.enableSwagger) {
    routes.push(createOpenApiRoutes(basePath, options.getRoutes));
  }

  // Unified proxy flag enables every door. Codex was omitted here for long
  // enough that it became reachable only from `neurolink proxy start`; a
  // consumer opting into proxying means all of it, not a subset.
  // Legacy per-format flags are still supported for backward compatibility.
  const enableClaudeProxy = options?.proxy || options?.claudeProxy;
  const enableOpenAIProxy = options?.proxy || options?.openaiProxy;
  const enableCodexProxy = options?.proxy || options?.codexProxy;
  const enableGeminiProxy = options?.proxy || options?.geminiProxy;

  if (enableClaudeProxy) {
    routes.push(
      createClaudeProxyRoutes(
        undefined,
        basePath,
        "fill-first",
        false,
        undefined,
        { inboundAuth: proxyAuth },
      ),
    );
  }

  if (enableOpenAIProxy) {
    routes.push(createOpenAIProxyRoutes(undefined, basePath));
  }

  if (enableCodexProxy) {
    routes.push(
      createCodexProxyRoutes(
        basePath,
        options?.runtimeConfigProvider,
        undefined,
        undefined,
        proxyAuth,
      ),
    );
  }

  if (enableGeminiProxy) {
    routes.push(createGeminiProxyRoutes(undefined, basePath));
  }

  return routes;
}

/**
 * Register all routes with a server adapter
 *
 * With `options.perUserAuth` this also turns on the adapter's
 * `carryMiddlewareState` (`enableMiddlewareStateCarry()`): the agent routes can
 * only take identity from `ctx.user` if the adapter hands the handler what
 * authentication middleware set. An adapter without that method must carry
 * state itself; otherwise the routes see a user only where the adapter happens
 * to share its context (Hono, when the client sent its own `X-Request-ID`), and
 * every other request runs as anonymous.
 */
export function registerAllRoutes(
  adapter: {
    registerRouteGroup: (group: RouteGroup) => void;
    listRoutes?: () => RouteDefinition[];
    enableMiddlewareStateCarry?: () => void;
    hasAuthenticationMiddleware?: () => boolean;
    noteSensitiveRoutes?: (options?: {
      allowUnauthenticated?: boolean;
    }) => void;
  },
  basePath: string = "/api",
  options?: CreateRoutesOptions,
): void {
  if (options?.perUserAuth) {
    adapter.enableMiddlewareStateCarry?.();
  }
  const allowUnauthenticated =
    options?.allowUnauthenticated === true || allowUnauthenticatedFromEnv();
  // The adapter knows whether authentication middleware is registered, and is
  // asked on every request, so authentication registered after the routes
  // counts. It also warns at start() when the routes that act on the host are
  // mounted with no such middleware (see BaseServerAdapter).
  adapter.noteSensitiveRoutes?.({ allowUnauthenticated });
  // If adapter has listRoutes and getRoutes not provided, use adapter's listRoutes
  const routeOptions: CreateRoutesOptions = {
    ...options,
    getRoutes: options?.getRoutes ?? adapter.listRoutes?.bind(adapter),
    hasAuthentication:
      options?.hasAuthentication ??
      (adapter.hasAuthenticationMiddleware
        ? () => adapter.hasAuthenticationMiddleware?.() === true
        : undefined),
  };
  const routeGroups = createAllRoutes(basePath, routeOptions);
  for (const group of routeGroups) {
    adapter.registerRouteGroup(group);
  }
}

/** `NEUROLINK_SERVER_ALLOW_UNAUTHENTICATED=1`: the operator's opt-out, read when routes are built. */
function allowUnauthenticatedFromEnv(): boolean {
  return process.env.NEUROLINK_SERVER_ALLOW_UNAUTHENTICATED?.trim() === "1";
}
