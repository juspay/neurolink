/**
 * OpenAI-Compatible Proxy Routes
 *
 * Exposes OpenAI Chat Completions-compatible /v1/chat/completions endpoint.
 * ALL requests are routed through ctx.neurolink.stream() — no direct
 * HTTP calls to any upstream provider.
 *
 * This is a thin wrapper that parses OpenAI format requests and delegates
 * to the shared proxy translation engine.
 *
 * An optional ModelRouter can remap incoming model names to different
 * provider/model pairs (e.g. "gpt-4o" -> vertex/gemini-2.5-pro).
 */

import {
  buildOpenAIError,
  convertClaudeToOpenAIResponse,
  convertOpenAIToClaudeRequest,
  createClaudeToOpenAIStreamTransform,
  parseOpenAIRequest,
} from "../../proxy/openaiFormat.js";
import { ProxyTracer } from "../../proxy/proxyTracer.js";
import {
  buildModelsListResponse,
  handleTranslatedJsonRequest,
  handleTranslatedStreamRequest,
} from "../../proxy/proxyTranslationEngine.js";
import { logRequest } from "../../proxy/requestLogger.js";
import { buildProxyTranslationPlan } from "../../proxy/routingPolicy.js";
import type {
  ClaudeResponse,
  ModelRouterInterface,
  OpenAICompletionRequest,
  ParsedOpenAIRequest,
  ProxyRuntimeConfigProvider,
  RouteGroup,
  ServerContext,
} from "../../types/index.js";
import { withTimeout } from "../../utils/async/withTimeout.js";
import { sanitizeForLog } from "../../utils/logSanitize.js";
import { logger } from "../../utils/logger.js";

// Maximum time the internal loopback fetch is allowed to take before we
// give up — keeps a stuck inner /v1/messages handler from hanging the outer
// /v1/chat/completions request indefinitely.
const LOOPBACK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes — long enough for slow Claude streams

// Default loopback port — matches the CLI proxy default. Overridden via
// `createOpenAIProxyRoutes`'s third argument when the actual listener port is
// known (e.g. when started from the CLI handler).
const DEFAULT_LOOPBACK_PORT = 55669;

function resolveStreamCancellationLifecycle(
  terminalStreamError: string | undefined,
): { status: number; errorType: string; errorMessage: string } {
  return terminalStreamError
    ? {
        status: 502,
        errorType: "loopback_stream_error",
        errorMessage: terminalStreamError,
      }
    : {
        status: 499,
        errorType: "client_cancelled",
        errorMessage: "Client cancelled the OpenAI-compatible stream",
      };
}

/**
 * Build an OpenAI-shaped error as a typed Response with the intended status.
 *
 * Without the explicit Response wrapper, the CLI proxy runtime maps plain
 * objects to HTTP 200, so error returns would silently arrive as 200s with
 * an error payload. Wrapping in Response forces the runtime to honor the
 * status code we computed.
 */
function buildOpenAIErrorResponse(status: number, message: string): Response {
  return new Response(JSON.stringify(buildOpenAIError(status, message)), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// ---------------------------------------------------------------------------
// Adapt ParsedOpenAIRequest to the shape buildProxyTranslationPlan expects
// ---------------------------------------------------------------------------

/**
 * buildProxyTranslationPlan's classifier expects ParsedClaudeRequest.
 * The shapes are nearly identical; we just fill in the extra fields it inspects
 * (thinkingConfig, topK) with safe defaults.
 */
function adaptForTranslationPlan(parsed: ParsedOpenAIRequest): {
  model: string;
  maxTokens: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  systemPrompt?: string;
  stream: boolean;
  prompt: string;
  images: string[];
  conversationMessages: Array<{ role: string; content: string }>;
  tools: Record<
    string,
    {
      description?: string;
      inputSchema: unknown;
      execute?: (...args: unknown[]) => unknown;
    }
  >;
  toolChoice?: "auto" | "required" | "none";
  toolChoiceName?: string;
  stopSequences?: string[];
  thinkingConfig?: { enabled: boolean };
} {
  return {
    model: parsed.model,
    maxTokens: parsed.maxTokens ?? 4096,
    temperature: parsed.temperature,
    topP: parsed.topP,
    systemPrompt:
      typeof parsed.systemPrompt === "string" ? parsed.systemPrompt : undefined,
    stream: parsed.stream,
    prompt: parsed.prompt,
    images: parsed.images,
    conversationMessages: parsed.conversationMessages,
    tools: parsed.tools,
    toolChoice: parsed.toolChoice,
    toolChoiceName: parsed.toolChoiceName,
    stopSequences: parsed.stopSequences,
  };
}

// ---------------------------------------------------------------------------
// OpenAI -> Anthropic loopback bridge
// ---------------------------------------------------------------------------

/**
 * Forward an OpenAI-format request targeting a Claude model through the
 * proxy's own /v1/messages endpoint via a loopback fetch().
 *
 * This reuses the full Claude passthrough path (OAuth account rotation, retry,
 * SSE interception, etc.) and only adds format conversion at the edges.
 *
 * The loopback target is ALWAYS `127.0.0.1:<loopbackPort>` (never derived
 * from the client-controlled `Host` header — that would be an SSRF vector).
 * `loopbackPort` is provided at route-build time from the listener's actual
 * port via `createOpenAIProxyRoutes(modelRouter, basePath, loopbackPort)`.
 */
async function handleOpenAIToAnthropicBridge(args: {
  ctx: ServerContext;
  body: OpenAICompletionRequest;
  targetModel: string;
  requestStartTime: number;
  loopbackPort: number;
}): Promise<unknown> {
  const { ctx, body, targetModel, requestStartTime, loopbackPort } = args;
  const stream = body.stream === true;
  const toolCount = body.tools?.length ?? 0;

  const writeLifecycle = (
    responseStatus: number,
    extra: {
      errorType?: string;
      errorMessage?: string;
      inputTokens?: number;
      outputTokens?: number;
      cacheCreationTokens?: number;
      cacheReadTokens?: number;
    } = {},
  ) =>
    logRequest({
      timestamp: new Date().toISOString(),
      requestId: ctx.requestId,
      method: ctx.method,
      path: ctx.path,
      model: body.model,
      stream,
      toolCount,
      account: "",
      accountType: "openai-bridge",
      responseStatus,
      responseTimeMs: Date.now() - requestStartTime,
      ...extra,
    });

  // Convert to Claude format and remap the model to the router's choice.
  const claudeBody = convertOpenAIToClaudeRequest(body);
  claudeBody.model = targetModel;

  // SECURITY: Never derive the loopback target from the client-controlled
  // `Host` header. The bridge always fetches from 127.0.0.1 on the listener's
  // configured port — anything else would be an SSRF vector.
  const internalUrl = `http://127.0.0.1:${loopbackPort}/v1/messages`;

  // Forward a minimal set of headers. The proxy's own /v1/messages handler
  // will attach OAuth credentials from its account pool.
  const forwardHeaders: Record<string, string> = {
    "content-type": "application/json",
    accept: stream ? "text/event-stream" : "application/json",
  };
  for (const [k, v] of Object.entries(ctx.headers)) {
    if (typeof v !== "string") {
      continue;
    }
    const lower = k.toLowerCase();
    if (lower.startsWith("anthropic-") || lower === "x-api-key") {
      forwardHeaders[lower] = v;
    }
  }

  // Bound the self-call with a timeout so a stuck inner handler can't hang
  // the outer /v1/chat/completions request indefinitely.
  const upstream = await withTimeout(
    fetch(internalUrl, {
      method: "POST",
      headers: forwardHeaders,
      body: JSON.stringify({ ...claudeBody, stream }),
    }),
    LOOPBACK_TIMEOUT_MS,
    `Anthropic loopback timed out after ${LOOPBACK_TIMEOUT_MS}ms`,
  );

  if (!upstream.ok) {
    const errText = await upstream.text().catch(() => "");
    const safeErrText = sanitizeForLog(errText);
    logger.always(
      `[proxy:openai] anthropic loopback error ${upstream.status}: ${safeErrText}`,
    );
    await writeLifecycle(upstream.status, {
      errorType: "loopback_upstream_error",
      errorMessage: safeErrText,
    });
    return buildOpenAIErrorResponse(
      upstream.status,
      safeErrText || `Anthropic loopback failed with status ${upstream.status}`,
    );
  }

  if (stream) {
    if (!upstream.body) {
      await writeLifecycle(502, {
        errorType: "loopback_empty_stream",
        errorMessage: "Anthropic loopback returned empty stream body",
      });
      return buildOpenAIErrorResponse(
        502,
        "Anthropic loopback returned empty stream body",
      );
    }
    let terminalStreamError: string | undefined;
    const transformed = upstream.body.pipeThrough(
      createClaudeToOpenAIStreamTransform(body.model, {
        onError: (message) => {
          terminalStreamError = sanitizeForLog(message);
        },
      }),
    );
    const reader = transformed.getReader();
    let lifecycleWritten = false;
    const finishLifecycle = async (
      status: number,
      errorType?: string,
      errorMessage?: string,
    ): Promise<void> => {
      if (lifecycleWritten) {
        return;
      }
      lifecycleWritten = true;
      await writeLifecycle(status, { errorType, errorMessage });
    };
    const trackedStream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          const { value, done } = await reader.read();
          if (done) {
            if (terminalStreamError) {
              await finishLifecycle(
                502,
                "loopback_stream_error",
                terminalStreamError,
              );
            } else {
              await finishLifecycle(200);
            }
            controller.close();
            return;
          }
          controller.enqueue(value);
        } catch (error) {
          const message = sanitizeForLog(
            error instanceof Error ? error.message : String(error),
          );
          await finishLifecycle(502, "loopback_stream_error", message);
          controller.error(error);
        }
      },
      async cancel(reason) {
        try {
          await reader.cancel(reason);
        } finally {
          const cancellation =
            resolveStreamCancellationLifecycle(terminalStreamError);
          await finishLifecycle(
            cancellation.status,
            cancellation.errorType,
            cancellation.errorMessage,
          );
        }
      },
    });
    return new Response(trackedStream, {
      status: 200,
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
        connection: "keep-alive",
      },
    });
  }

  const claudeJson = (await upstream.json()) as ClaudeResponse;
  await writeLifecycle(200, {
    inputTokens: claudeJson.usage?.input_tokens,
    outputTokens: claudeJson.usage?.output_tokens,
    cacheCreationTokens: claudeJson.usage?.cache_creation_input_tokens,
    cacheReadTokens: claudeJson.usage?.cache_read_input_tokens,
  });
  return convertClaudeToOpenAIResponse(claudeJson, body.model);
}

// ---------------------------------------------------------------------------
// Route factory
// ---------------------------------------------------------------------------

/**
 * Create OpenAI-compatible proxy routes.
 *
 * Every request flows through ctx.neurolink.stream() — no direct HTTP calls
 * to any upstream provider.
 *
 * @param modelRouter   - Optional model router for remapping model names.
 * @param basePath      - Base path prefix (default: "").
 * @param loopbackPort  - Listener port used by the Anthropic loopback bridge.
 *                        Defaults to the CLI proxy default (55669). MUST be the
 *                        actual listener port — never derived from request
 *                        headers — to avoid SSRF.
 * @returns RouteGroup with OpenAI-compatible endpoints.
 */
export function createOpenAIProxyRoutes(
  modelRouter?: ModelRouterInterface,
  basePath: string = "",
  loopbackPort: number = DEFAULT_LOOPBACK_PORT,
  runtimeConfigProvider?: ProxyRuntimeConfigProvider,
): RouteGroup {
  return {
    prefix: `${basePath}/v1`,
    routes: [
      // =================================================================
      // POST /v1/chat/completions — Main chat completions endpoint
      // =================================================================
      {
        method: "POST",
        path: `${basePath}/v1/chat/completions`,
        description: "OpenAI-compatible chat completions (translation mode)",
        handler: async (ctx: ServerContext) => {
          const requestModelRouter = runtimeConfigProvider
            ? runtimeConfigProvider().modelRouter
            : modelRouter;
          const requestStartTime = Date.now();
          const body = ctx.body as OpenAICompletionRequest | undefined;

          // --- Validation ---
          if (!body || !body.model || !body.messages?.length) {
            return buildOpenAIErrorResponse(
              400,
              "Request must include 'model' and 'messages' fields",
            );
          }

          // --- Resolve target provider/model ---
          const route = requestModelRouter
            ? requestModelRouter.resolve(body.model)
            : { provider: null, model: body.model };
          const targetProvider = route.provider ?? undefined;
          const targetModel = route.model ?? body.model;

          logger.debug(
            `[proxy:openai] ${body.model} → ${targetProvider ?? "auto"}/${targetModel}`,
          );

          // --- Anthropic loopback bridge ---
          // When the resolved target is Anthropic, the proxy has no
          // ANTHROPIC_API_KEY (it uses OAuth passthrough). Instead of trying
          // to stream through the SDK, forward the request to our own
          // /v1/messages endpoint via loopback so it goes through the full
          // Claude passthrough path (OAuth, retry, rotation, SSE intercept).
          if (route.provider === "anthropic") {
            try {
              return await handleOpenAIToAnthropicBridge({
                ctx,
                body,
                targetModel,
                requestStartTime,
                loopbackPort,
              });
            } catch (err) {
              // Internal exception text (.message + any stack-trace remnants)
              // is kept ONLY in server-side logs + tracer. The client receives
              // a fixed generic message so internal paths/frames don't leak
              // back through the response body. (CodeQL: information exposure
              // through a stack trace.)
              const rawMessage =
                err instanceof Error ? err.message : String(err);
              const internalDetail = sanitizeForLog(rawMessage);
              logger.always(
                `[proxy:openai] anthropic loopback failed: ${internalDetail}`,
              );
              await logRequest({
                timestamp: new Date().toISOString(),
                requestId: ctx.requestId,
                method: ctx.method,
                path: ctx.path,
                model: body.model,
                stream: body.stream === true,
                toolCount: body.tools?.length ?? 0,
                account: "",
                accountType: "openai-bridge",
                responseStatus: 502,
                responseTimeMs: Date.now() - requestStartTime,
                errorType: "loopback_exception",
                errorMessage: internalDetail,
              });
              return buildOpenAIErrorResponse(502, "Anthropic loopback failed");
            }
          }

          // --- Parse request ---
          const parsed = parseOpenAIRequest(body);

          // --- Build translation plan ---
          const adapted = adaptForTranslationPlan(parsed);
          const plan = buildProxyTranslationPlan(
            {
              provider: targetProvider ?? "auto",
              model: targetModel,
            },
            requestModelRouter?.getFallbackChain() ?? [],
            body.model,
            // The classifier only reads fields present on both types.
            adapted as Parameters<typeof buildProxyTranslationPlan>[3],
            requestModelRouter?.isAutoFallbackEnabled?.() ?? false,
          );
          const attempts = plan.attempts;

          // --- Optional tracing ---
          let tracer: ProxyTracer | undefined;
          try {
            tracer = ProxyTracer.startRequest(
              {
                requestId: ctx.requestId,
                method: ctx.method,
                path: ctx.path,
                model: body.model,
                stream: body.stream === true,
                toolCount: Object.keys(parsed.tools).length,
                clientApp: "openai-compat",
                userAgent: ctx.headers["user-agent"] ?? "",
                // Without this the tracer defaults to "anthropic" and every
                // non-Anthropic model prices to $0 (the anthropic table has no
                // _default), while a claude-* alias routed elsewhere prices at
                // Claude rates. Both are wrong in opposite directions.
                provider: targetProvider ?? "openai-compatible",
              },
              ctx.headers,
            );
            tracer.setMode("full");
          } catch {
            // Tracing is best-effort; continue without it.
          }

          // --- Dispatch via shared translation engine ---
          try {
            if (body.stream) {
              return handleTranslatedStreamRequest({
                ctx,
                format: "openai",
                requestModel: body.model,
                parsed,
                attempts,
                tracer,
                requestStartTime,
              });
            }

            return await handleTranslatedJsonRequest({
              ctx,
              format: "openai",
              requestModel: body.model,
              parsed,
              attempts,
              tracer,
              requestStartTime,
            });
          } catch (err) {
            // Internal exception text is kept ONLY in server-side logs +
            // tracer. The client receives a fixed generic message so internal
            // paths/frames don't leak back through the response body.
            // (CodeQL: information exposure through a stack trace.)
            const rawMessage = err instanceof Error ? err.message : String(err);
            const internalDetail = sanitizeForLog(rawMessage);
            logger.always(`[proxy:openai] request failed: ${internalDetail}`);
            tracer?.setError("generation_error", internalDetail);
            tracer?.end(500, Date.now() - requestStartTime);
            return buildOpenAIErrorResponse(500, "Internal proxy error");
          }
        },
      },

      // =================================================================
      // GET /v1/models — List available models (OpenAI list format)
      // =================================================================
      {
        method: "GET",
        path: `${basePath}/v1/models`,
        description: "List available models in OpenAI format",
        handler: async () => {
          const requestModelRouter = runtimeConfigProvider
            ? runtimeConfigProvider().modelRouter
            : modelRouter;
          return buildModelsListResponse(requestModelRouter);
        },
      },
    ],
  };
}

export const __testHooks = { resolveStreamCancellationLifecycle };
