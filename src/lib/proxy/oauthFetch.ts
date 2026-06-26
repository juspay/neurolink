/**
 * Shared OAuth fetch wrapper for Anthropic API requests.
 *
 * Extracted from `providers/anthropic.ts` so that any provider or proxy layer
 * that needs OAuth-authenticated Anthropic requests can reuse the same logic.
 *
 * Applies full "cloaking" to make requests indistinguishable from the
 * official Claude CLI / CLIProxyAPI, which is required for OAuth + tools
 * to work correctly.
 *
 * @module proxy/oauthFetch
 */

import {
  buildStableClaudeCodeBillingHeader,
  CLAUDE_CLI_USER_AGENT,
  CLAUDE_CODE_OAUTH_BETAS,
  getOrCreateClaudeCodeIdentity,
  MCP_TOOL_PREFIX,
} from "../auth/anthropicOAuth.js";
import { logger } from "../utils/logger.js";
import { createProxyFetch } from "./proxyFetch.js";
import { relocateClientSystemIntoMessages } from "./systemRelocation.js";

// Re-export constants for consumers that previously imported them alongside
// the function from `providers/anthropic.ts`.
export { CLAUDE_CLI_USER_AGENT, MCP_TOOL_PREFIX };

function resolveOAuthRequestUrl(input: RequestInfo | URL): URL | null {
  try {
    if (typeof input === "string" || input instanceof URL) {
      return new URL(input.toString());
    }
    if (input instanceof Request) {
      return new URL(input.url);
    }
  } catch {
    return null;
  }

  return null;
}

function mergeRequestHeaders(
  input: RequestInfo | URL,
  init?: RequestInit,
): Headers {
  const requestHeaders = new Headers();

  if (input instanceof Request) {
    input.headers.forEach((value, key) => {
      requestHeaders.set(key, value);
    });
  }

  if (!init?.headers) {
    return requestHeaders;
  }

  if (init.headers instanceof Headers) {
    init.headers.forEach((value, key) => {
      requestHeaders.set(key, value);
    });
    return requestHeaders;
  }

  if (Array.isArray(init.headers)) {
    for (const [key, value] of init.headers) {
      if (typeof value !== "undefined") {
        requestHeaders.set(key, String(value));
      }
    }
    return requestHeaders;
  }

  for (const [key, value] of Object.entries(init.headers)) {
    if (typeof value !== "undefined") {
      requestHeaders.set(key, String(value));
    }
  }

  return requestHeaders;
}

function applyOAuthHeaders(
  requestHeaders: Headers,
  getToken: () => string,
  includeOptionalBetas: boolean,
  skipBodyTransform: boolean,
): void {
  const existingBetas = (requestHeaders.get("anthropic-beta") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const requiredBetas = ["oauth-2025-04-20"];

  if (!skipBodyTransform) {
    requiredBetas.push(
      ...(includeOptionalBetas
        ? CLAUDE_CODE_OAUTH_BETAS.filter((beta) => beta !== "oauth-2025-04-20")
        : []),
    );
  }

  requestHeaders.set("authorization", `Bearer ${getToken()}`);
  requestHeaders.set(
    "anthropic-beta",
    [...new Set([...existingBetas, ...requiredBetas])].join(","),
  );
  requestHeaders.delete("x-api-key");

  if (skipBodyTransform) {
    return;
  }

  requestHeaders.set("user-agent", CLAUDE_CLI_USER_AGENT);
  requestHeaders.set("anthropic-version", "2023-06-01");
  requestHeaders.set("accept", "application/json");
  requestHeaders.set("anthropic-dangerous-direct-browser-access", "true");
  requestHeaders.set("x-app", "cli");
  requestHeaders.set("connection", "keep-alive");
  requestHeaders.set("x-stainless-retry-count", "0");
  requestHeaders.set("x-stainless-runtime-version", "v24.3.0");
  requestHeaders.set("x-stainless-package-version", "0.74.0");
  requestHeaders.set("x-stainless-runtime", "node");
  requestHeaders.set("x-stainless-lang", "js");
  requestHeaders.set(
    "x-stainless-arch",
    process.arch === "x64" ? "x64" : process.arch,
  );
  requestHeaders.set(
    "x-stainless-os",
    process.platform === "darwin"
      ? "MacOS"
      : process.platform === "win32"
        ? "Windows"
        : "Linux",
  );
  requestHeaders.set("x-stainless-timeout", "600");
}

async function resolveOAuthRequestBody(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<{
  sourceRequest?: Request;
  method?: string;
  body: BodyInit | undefined;
}> {
  const sourceRequest = input instanceof Request ? input : undefined;
  const method = init?.method ?? sourceRequest?.method;
  let body = init?.body;

  if (
    body === undefined &&
    sourceRequest &&
    method !== "GET" &&
    method !== "HEAD"
  ) {
    const contentType = sourceRequest.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      body = (await sourceRequest.clone().text()) || undefined;
    } else {
      body = sourceRequest.clone().body ?? undefined;
    }
  }

  return { sourceRequest, method, body: body ?? undefined };
}

function transformOAuthJsonBody(
  body: string,
  requestHeaders: Headers,
  getToken: () => string,
  enableMcpPrefix: boolean,
): string {
  const parsed = JSON.parse(body);

  if (enableMcpPrefix) {
    if (parsed.tools && Array.isArray(parsed.tools)) {
      parsed.tools = parsed.tools.map(
        (tool: { name?: string; [key: string]: unknown }) => ({
          ...tool,
          name: tool.name ? `${MCP_TOOL_PREFIX}${tool.name}` : tool.name,
        }),
      );
    }

    if (parsed.messages && Array.isArray(parsed.messages)) {
      parsed.messages = parsed.messages.map(
        (msg: { content?: unknown; [key: string]: unknown }) => {
          if (msg.content && Array.isArray(msg.content)) {
            msg.content = msg.content.map((block: unknown) => {
              const b = block as {
                type?: string;
                name?: string;
                [key: string]: unknown;
              };
              if (b.type === "tool_use" && b.name) {
                return {
                  ...b,
                  name: `${MCP_TOOL_PREFIX}${b.name}`,
                };
              }
              return block;
            });
          }
          return msg;
        },
      );
    }
  }

  if (
    parsed.tool_choice?.type === "any" ||
    parsed.tool_choice?.type === "tool"
  ) {
    delete parsed.thinking;
  }

  const agentBlock = {
    type: "text",
    text: "You are a Claude agent, built on Anthropic's Claude Agent SDK.",
  };

  // Normalise `system` to an array, then route by client type.
  //
  // The subscription/OAuth path only accepts a `system` it recognises as the
  // genuine Claude Code prompt. A real CC client sends its own billing + agent
  // identity blocks — we keep those and just stabilise the volatile billing
  // `cch`. A custom client sends its own arbitrary system prompt with NO agent
  // block; left in `system` it is rejected as `rate_limit_error: "Error"`, so we
  // relocate it into the message stream and send only the recognised billing +
  // agent blocks as `system`.
  if (parsed.system) {
    if (typeof parsed.system === "string") {
      parsed.system = [{ type: "text", text: parsed.system }];
    }
    if (Array.isArray(parsed.system)) {
      // Find existing billing/agent blocks wherever the client placed them.
      const billingIdx = parsed.system.findIndex(
        (b: { text?: string }) =>
          typeof b.text === "string" &&
          b.text.includes("x-anthropic-billing-header"),
      );
      const agentIdx = parsed.system.findIndex(
        (b: { text?: string }) =>
          typeof b.text === "string" && b.text.includes("Claude Agent SDK"),
      );
      const billingBlock = {
        type: "text",
        text: buildStableClaudeCodeBillingHeader(
          parsed.system[billingIdx]?.text,
        ),
      };

      // A genuine Claude Code client supplies its own agent-identity block;
      // a custom client does not.
      const isClaudeCodeClient = agentIdx >= 0;

      // Strip billing/agent from their positions (reverse order so indices
      // stay valid). What remains is the client's "extra" system content.
      const indicesToRemove = [billingIdx, agentIdx]
        .filter((i) => i >= 0)
        .sort((a, b) => b - a);
      for (const idx of indicesToRemove) {
        parsed.system.splice(idx, 1);
      }

      if (!isClaudeCodeClient && parsed.system.length > 0) {
        // Non-CC client: relocate its system into the message stream so the
        // subscription/OAuth path accepts the request.
        relocateClientSystemIntoMessages(parsed, parsed.system);
        parsed.system = [billingBlock, agentBlock];
      } else {
        // Genuine Claude Code (or no extra blocks): keep system and append the
        // deterministic billing + agent blocks at the end.
        parsed.system = [...parsed.system, billingBlock, agentBlock];
      }
    }
  } else {
    const billingBlock = {
      type: "text",
      text: buildStableClaudeCodeBillingHeader(),
    };
    parsed.system = [billingBlock, agentBlock];
  }

  const token = getToken();
  const stableId =
    parsed.metadata?.user_id ?? token.substring(0, Math.min(20, token.length));
  const identity = getOrCreateClaudeCodeIdentity(stableId, {
    existingUserId: parsed.metadata?.user_id,
    preferredSessionId:
      requestHeaders.get("x-claude-code-session-id") ?? undefined,
  });
  parsed.metadata = {
    ...parsed.metadata,
    user_id: identity.metadataUserId,
  };
  requestHeaders.set("x-claude-code-session-id", identity.sessionId);

  return JSON.stringify(parsed);
}

async function injectOtelHeaders(requestHeaders: Headers): Promise<void> {
  try {
    const { propagation: otelPropagation, context: otelContext } =
      await import("@opentelemetry/api");
    const carrier: Record<string, string> = {};
    otelPropagation.inject(otelContext.active(), carrier);
    for (const [key, value] of Object.entries(carrier)) {
      if (!requestHeaders.has(key)) {
        requestHeaders.set(key, value);
      }
    }
  } catch {
    // OTel not available — skip silently
  }
}

function rewriteMcpPrefixedStreamingResponse(response: Response): Response {
  if (!response.body) {
    return response;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const responseHeaders = new Headers(response.headers);
  responseHeaders.delete("content-length");
  let carry = "";

  const stream = new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        if (carry) {
          controller.enqueue(
            encoder.encode(
              carry.replace(/"name"\s*:\s*"mcp_([^"]+)"/g, '"name": "$1"'),
            ),
          );
          carry = "";
        }
        controller.close();
        return;
      }

      const chunkText = decoder.decode(value, { stream: true });
      const combined = carry + chunkText;
      const partialMatch = combined.match(/"name"\s*:\s*"mcp_[^"]*$/);
      let safeText: string;

      if (partialMatch && partialMatch.index !== undefined) {
        safeText = combined.slice(0, partialMatch.index);
        carry = combined.slice(partialMatch.index);
      } else {
        const lastQuote = combined.lastIndexOf('"');
        const safeLen = lastQuote >= 0 ? lastQuote + 1 : combined.length;
        safeText = combined.slice(0, safeLen);
        carry = combined.slice(safeLen);
      }

      const replaced = safeText.replace(
        /"name"\s*:\s*"mcp_([^"]+)"/g,
        '"name": "$1"',
      );
      if (replaced) {
        controller.enqueue(encoder.encode(replaced));
      }
    },
    async cancel(reason) {
      await reader.cancel(reason);
    },
  });

  return new Response(stream, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

async function executeOAuthFetch(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  getToken: () => string,
  includeOptionalBetas: boolean,
  enableMcpPrefix: boolean,
  skipBodyTransform: boolean,
): Promise<Response> {
  const requestUrl = resolveOAuthRequestUrl(input);
  if (
    requestUrl &&
    requestUrl.pathname === "/v1/messages" &&
    !requestUrl.searchParams.has("beta")
  ) {
    requestUrl.searchParams.set("beta", "true");
  }

  const requestHeaders = mergeRequestHeaders(input, init);
  applyOAuthHeaders(
    requestHeaders,
    getToken,
    includeOptionalBetas,
    skipBodyTransform,
  );

  logger.debug("[createOAuthFetch] Making OAuth request:", {
    url: requestUrl?.toString() || input.toString(),
    hasAuthorization: requestHeaders.has("authorization"),
    authType: "Bearer",
    anthropicBeta: requestHeaders.get("anthropic-beta"),
    userAgent: requestHeaders.get("user-agent"),
  });

  const {
    sourceRequest,
    method,
    body: initialBody,
  } = await resolveOAuthRequestBody(input, init);
  let body = initialBody;

  if (body && typeof body === "string" && !skipBodyTransform) {
    try {
      body = transformOAuthJsonBody(
        body,
        requestHeaders,
        getToken,
        enableMcpPrefix,
      );
    } catch {
      // Ignore JSON parse errors — pass body through unchanged
    }
  }

  requestHeaders.delete("content-length");
  await injectOtelHeaders(requestHeaders);

  const proxyFetch = createProxyFetch();
  const response = await proxyFetch(
    requestUrl?.toString() ||
      (input instanceof Request ? input.url : input.toString()),
    {
      ...init,
      method,
      body,
      signal: init?.signal ?? sourceRequest?.signal,
      headers: requestHeaders,
    },
  );

  return enableMcpPrefix
    ? rewriteMcpPrefixedStreamingResponse(response)
    : response;
}

// ---------------------------------------------------------------------------
// Main factory
// ---------------------------------------------------------------------------

/**
 * Creates a custom fetch function for OAuth-authenticated requests.
 * This wrapper applies all required transformations for OAuth mode:
 * - Uses Authorization: Bearer header (NOT x-api-key)
 * - Adds OAuth-required beta headers
 * - Sets User-Agent to Claude CLI
 * - Adds ?beta=true query parameter to /v1/messages
 * - Injects billing header & agent block into system prompt
 * - Injects Claude-Code-shaped user ID into metadata
 * - Adds Stainless SDK headers for fingerprint matching
 * - Disables thinking when tool_choice is forced
 *
 * Accepts a getter function instead of a static token so that refreshed
 * tokens are picked up automatically on each request.
 *
 * @param getToken              - Function returning the current OAuth access token
 * @param includeOptionalBetas  - Whether to include optional beta headers (default true)
 * @param enableMcpPrefix       - Whether to apply mcp_ prefix/strip logic to tool names (default false)
 * @param skipBodyTransform     - When true, skip ALL body modifications (billing header, user ID, tool prefix).
 *                                Used for proxy passthrough where the request body must be forwarded as-is.
 */
export function createOAuthFetch(
  getToken: () => string,
  includeOptionalBetas = true,
  enableMcpPrefix = false,
  skipBodyTransform = false,
): typeof fetch {
  return async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> =>
    executeOAuthFetch(
      input,
      init,
      getToken,
      includeOptionalBetas,
      enableMcpPrefix,
      skipBodyTransform,
    );
}
