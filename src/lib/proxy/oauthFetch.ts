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
  CLAUDE_CLI_USER_AGENT,
  CLAUDE_CODE_OAUTH_BETAS,
  MCP_TOOL_PREFIX,
  buildStableClaudeCodeBillingHeader,
  getOrCreateClaudeCodeIdentity,
} from "../auth/anthropicOAuth.js";
import { logger } from "../utils/logger.js";

// Re-export constants for consumers that previously imported them alongside
// the function from `providers/anthropic.ts`.
export { CLAUDE_CLI_USER_AGENT, MCP_TOOL_PREFIX };

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
  ): Promise<Response> => {
    // Build the URL
    let requestUrl: URL | null = null;

    try {
      if (typeof input === "string" || input instanceof URL) {
        requestUrl = new URL(input.toString());
      } else if (input instanceof Request) {
        requestUrl = new URL(input.url);
      }
    } catch {
      requestUrl = null;
    }

    // Add ?beta=true to /v1/messages endpoint
    if (
      requestUrl &&
      requestUrl.pathname === "/v1/messages" &&
      !requestUrl.searchParams.has("beta")
    ) {
      requestUrl.searchParams.set("beta", "true");
    }

    // Build new headers
    const requestHeaders = new Headers();

    // Copy headers from Request object if present
    if (input instanceof Request) {
      input.headers.forEach((value, key) => {
        requestHeaders.set(key, value);
      });
    }

    // Copy headers from init if present
    if (init?.headers) {
      if (init.headers instanceof Headers) {
        init.headers.forEach((value, key) => {
          requestHeaders.set(key, value);
        });
      } else if (Array.isArray(init.headers)) {
        for (const [key, value] of init.headers) {
          if (typeof value !== "undefined") {
            requestHeaders.set(key, String(value));
          }
        }
      } else {
        for (const [key, value] of Object.entries(init.headers)) {
          if (typeof value !== "undefined") {
            requestHeaders.set(key, String(value));
          }
        }
      }
    }

    // ------------------------------------------------------------------
    // Beta headers — preserve existing client betas and merge in required ones.
    // In passthrough mode, Claude Code sends its own betas that MUST be kept
    // (e.g., context-management-2025-06-27). We only add oauth if missing.
    // ------------------------------------------------------------------
    const existingBetas = (requestHeaders.get("anthropic-beta") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const requiredBetas = ["oauth-2025-04-20"];

    // Only add our betas if not already present in client's headers
    if (!skipBodyTransform) {
      // Direct NeuroLink usage — set full beta list
      requiredBetas.push(
        ...(includeOptionalBetas
          ? CLAUDE_CODE_OAUTH_BETAS.filter(
              (beta) => beta !== "oauth-2025-04-20",
            )
          : []),
      );
    }

    const allBetas = [...new Set([...existingBetas, ...requiredBetas])];
    const mergedBetas = allBetas.join(",");

    // Set OAuth authorization (Bearer token, NOT x-api-key)
    // Call getToken() each time so refreshed tokens are used automatically.
    requestHeaders.set("authorization", `Bearer ${getToken()}`);
    requestHeaders.set("anthropic-beta", mergedBetas);
    if (!skipBodyTransform) {
      // Only override user-agent for direct NeuroLink usage
      requestHeaders.set("user-agent", CLAUDE_CLI_USER_AGENT);
      requestHeaders.set("anthropic-version", "2023-06-01");
      requestHeaders.set("accept", "application/json");
    }
    requestHeaders.delete("x-api-key");

    // Identity / fingerprint headers (skip in passthrough — client sends its own)
    if (!skipBodyTransform) {
      requestHeaders.set("anthropic-dangerous-direct-browser-access", "true");
      requestHeaders.set("x-app", "cli");
      requestHeaders.set("connection", "keep-alive");

      // Stainless SDK headers
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

    logger.debug("[createOAuthFetch] Making OAuth request:", {
      url: requestUrl?.toString() || input.toString(),
      hasAuthorization: requestHeaders.has("authorization"),
      authType: "Bearer",
      anthropicBeta: requestHeaders.get("anthropic-beta"),
      userAgent: requestHeaders.get("user-agent"),
    });

    // ------------------------------------------------------------------
    // Body transformations (skipped in passthrough/proxy mode)
    // ------------------------------------------------------------------
    const sourceRequest = input instanceof Request ? input : undefined;
    const method = init?.method ?? sourceRequest?.method;
    let body = init?.body;
    if (
      body === undefined &&
      sourceRequest &&
      method !== "GET" &&
      method !== "HEAD"
    ) {
      // Read the body as text (not ReadableStream) so that the JSON transforms
      // below can parse and modify it. A ReadableStream would bypass the
      // `typeof body === "string"` branch and skip all cloaking transforms.
      const contentType = sourceRequest.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        body = (await sourceRequest.clone().text()) || undefined;
      } else {
        body = sourceRequest.clone().body ?? undefined;
      }
    }
    if (body && typeof body === "string" && !skipBodyTransform) {
      try {
        const parsed = JSON.parse(body);

        // --- mcp_ prefix (only when explicitly enabled) ----------------
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

        // --- Disable thinking when tool_choice is forced ---------------
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

        // Normalise `system` to an array and APPEND billing + agent blocks.
        // IMPORTANT: We append (not prepend) to preserve the client's cache
        // prefix chain. Anthropic's prompt caching uses prefix matching — if
        // we insert anything before the client's system blocks, we invalidate
        // all cached content (tools, system prompt, message history).
        //
        // Claude Code sends a billing block with a `cch=<hash>` value that
        // changes on every request. We remove any existing billing/agent
        // blocks from their positions and always append our stable
        // Claude-Code-shaped versions at the end.
        if (parsed.system) {
          if (typeof parsed.system === "string") {
            parsed.system = [{ type: "text", text: parsed.system }];
          }
          if (Array.isArray(parsed.system)) {
            // Find and remove existing billing/agent blocks from wherever
            // the client placed them (typically at system[0])
            const billingIdx = parsed.system.findIndex(
              (b: { text?: string }) =>
                typeof b.text === "string" &&
                b.text.includes("x-anthropic-billing-header"),
            );
            const agentIdx = parsed.system.findIndex(
              (b: { text?: string }) =>
                typeof b.text === "string" &&
                b.text.includes("Claude Agent SDK"),
            );
            const billingBlock = {
              type: "text",
              text: buildStableClaudeCodeBillingHeader(
                parsed.system[billingIdx]?.text,
              ),
            };

            // Remove in reverse index order so indices stay valid
            const indicesToRemove = [billingIdx, agentIdx]
              .filter((i) => i >= 0)
              .sort((a, b) => b - a);
            for (const idx of indicesToRemove) {
              parsed.system.splice(idx, 1);
            }

            // Always append deterministic billing + agent blocks at the end
            parsed.system = [...parsed.system, billingBlock, agentBlock];
          }
        } else {
          const billingBlock = {
            type: "text",
            text: buildStableClaudeCodeBillingHeader(),
          };
          parsed.system = [billingBlock, agentBlock];
        }

        // --- Inject Claude-Code-shaped identity into metadata ----------
        // Prefer existing metadata.user_id (refresh-stable) over the access
        // token prefix, which changes on every token rotation.
        const stableId =
          parsed.metadata?.user_id ??
          getToken().substring(0, Math.min(20, getToken().length));
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

        body = JSON.stringify(parsed);
      } catch {
        // Ignore JSON parse errors — pass body through unchanged
      }
    }

    // Remove any inherited content-length — the body may have been transformed
    // above, so the original length is stale. Let fetch/undici recalculate it.
    requestHeaders.delete("content-length");

    // Inject OTel traceparent so the proxy can link to this trace
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

    // Make the request
    const response = await fetch(
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

    // Transform streaming response to rename tools back (remove mcp_ prefix).
    // Uses a dynamically-sized carry buffer that holds any incomplete JSON
    // token spanning a chunk boundary (e.g. a partial `"name": "mcp_..."`).
    if (enableMcpPrefix && response.body) {
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
            // Flush any remaining carry
            if (carry) {
              const flushed = carry.replace(
                /"name"\s*:\s*"mcp_([^"]+)"/g,
                '"name": "$1"',
              );
              controller.enqueue(encoder.encode(flushed));
              carry = "";
            }
            controller.close();
            return;
          }

          const chunkText = decoder.decode(value, { stream: true });
          const combined = carry + chunkText;
          // Detect a trailing partial `"name":\s*"mcp_...` that hasn't closed
          // yet (no closing quote for the value). We must keep the entire
          // partial field in carry so the regex can match it once the next
          // chunk completes it.
          const partialMatch = combined.match(/"name"\s*:\s*"mcp_[^"]*$/);
          let safeText: string;
          if (partialMatch && partialMatch.index !== undefined) {
            // Partial mcp_ name field at end — carry the entire partial field
            safeText = combined.slice(0, partialMatch.index);
            carry = combined.slice(partialMatch.index);
          } else {
            // No partial mcp_ field — safe to process everything.
            // Still carry trailing content after the last quote to avoid
            // splitting other JSON tokens.
            const lastQuote = combined.lastIndexOf('"');
            const safeLen = lastQuote >= 0 ? lastQuote + 1 : combined.length;
            safeText = combined.slice(0, safeLen);
            carry = combined.slice(safeLen);
          }
          // Apply the mcp_ stripping regex on the safe portion
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

    return response;
  };
}
