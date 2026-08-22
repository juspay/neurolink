/**
 * Gemini-Compatible Proxy Routes
 *
 * Exposes the Google `generateContent` / `streamGenerateContent` endpoints the
 * Gemini CLI calls when pointed at this proxy via `GOOGLE_GEMINI_BASE_URL`.
 * ALL requests are routed through ctx.neurolink.stream() via the shared proxy
 * translation engine — no direct HTTP calls to any upstream provider.
 *
 * This is a thin wrapper that parses the Google wire format and delegates to
 * the same translation engine openaiProxyRoutes.ts and claudeProxyRoutes.ts
 * use, mirroring that file's validate → log → delegate shape.
 *
 * An optional ModelRouter can remap incoming model names to different
 * provider/model pairs, exactly as it does for the OpenAI-compatible door.
 */

import {
  buildGeminiErrorResponse,
  parseGeminiRequest,
} from "../../proxy/geminiFormat.js";
import { ProxyTracer } from "../../proxy/proxyTracer.js";
import {
  handleTranslatedJsonRequest,
  handleTranslatedStreamRequest,
} from "../../proxy/proxyTranslationEngine.js";
import { buildProxyTranslationPlan } from "../../proxy/routingPolicy.js";
import type {
  ModelRouterInterface,
  ParsedGeminiRequest,
  ProxyRuntimeConfigProvider,
  RouteGroup,
  ServerContext,
} from "../../types/index.js";
import { sanitizeForLog } from "../../utils/logSanitize.js";
import { logger } from "../../utils/logger.js";

// Default loopback port — kept only for signature parity with
// createOpenAIProxyRoutes. Gemini has no Anthropic-loopback bridge (nothing
// in the Google wire format needs the OAuth-passthrough detour), so the value
// is threaded through but never read.
const DEFAULT_LOOPBACK_PORT = 55669;

const GENERATE = "generateContent";
const STREAM_GENERATE = "streamGenerateContent";

// ---------------------------------------------------------------------------
// Path parsing
// ---------------------------------------------------------------------------

/**
 * Google bakes the action into the final path segment as `<model>:<action>`
 * (`models/gemini-2.5-pro:generateContent`). Hono's router has no way to
 * express a literal `:` after a named param — verified directly against the
 * `hono` version this repo pins: registering `:model\:generateContent`
 * doesn't escape the colon, it becomes *part of the param name*, and the
 * resulting param still greedily swallows the whole trailing segment
 * (`streamGenerateContent` included) because nothing after the leading `:`
 * stops the capture except the next `/`. A `:model{regex}` constraint
 * followed by literal text fails outright — the route never matches (404 on
 * every request). A bare `:model` segment is therefore the only shape that
 * actually matches; it captures `<model>:<action>` whole, and this function
 * splits it back apart in the handler instead of in the route table.
 */
/**
 * Pull "<model>:<action>" out of the request path.
 *
 * Read from `ctx.path`, not from a route param. Hono does capture the whole
 * `gemini-2.5-pro:generateContent` segment — the colon is not a route
 * separator, so one route covers both actions — but the proxy's mount loop
 * builds its ServerContext from `path`, `headers`, `query`, `body`, `method`
 * and `requestId` only. The captured param never reaches the handler, and
 * reading `ctx.params` here would be `undefined` on every request.
 */
function splitModelAction(requestPath: string): {
  modelId: string;
  action: string | undefined;
} {
  // Take the last path segment, ignoring any trailing slash or query.
  const withoutQuery = requestPath.split("?")[0];
  const rawSegment = withoutQuery.replace(/\/+$/, "").split("/").pop() ?? "";
  const separatorIndex = rawSegment.lastIndexOf(":");
  if (separatorIndex === -1) {
    return { modelId: rawSegment, action: undefined };
  }
  return {
    modelId: rawSegment.slice(0, separatorIndex),
    action: rawSegment.slice(separatorIndex + 1),
  };
}

// ---------------------------------------------------------------------------
// Adapt ParsedGeminiRequest to the shape buildProxyTranslationPlan expects
// ---------------------------------------------------------------------------

/**
 * buildProxyTranslationPlan's classifier expects ParsedClaudeRequest, whose
 * `maxTokens` is required. Gemini's is optional (Google omits
 * `generationConfig.maxOutputTokens` on plenty of real requests), so the gap
 * is bridged the same way the OpenAI door bridges it: fill in a safe default
 * and let the (structurally near-identical) rest pass through untouched.
 */
function adaptGeminiForTranslationPlan(parsed: ParsedGeminiRequest): {
  model: string;
  maxTokens: number;
  temperature?: number;
  topP?: number;
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
  stopSequences?: string[];
} {
  return {
    model: parsed.model,
    maxTokens: parsed.maxTokens ?? 4096,
    temperature: parsed.temperature,
    topP: parsed.topP,
    systemPrompt: parsed.systemPrompt,
    stream: parsed.stream,
    prompt: parsed.prompt,
    images: parsed.images,
    conversationMessages: parsed.conversationMessages,
    tools: parsed.tools,
    stopSequences: parsed.stopSequences,
  };
}

// ---------------------------------------------------------------------------
// Route factory
// ---------------------------------------------------------------------------

/**
 * Create Gemini-compatible proxy routes.
 *
 * Every request flows through ctx.neurolink.stream() — no direct HTTP calls
 * to any upstream provider.
 *
 * @param modelRouter   - Optional model router for remapping model names.
 * @param basePath      - Base path prefix (default: "").
 * @param loopbackPort  - Unused by this door; kept for parameter-shape parity
 *                        with createOpenAIProxyRoutes (see DEFAULT_LOOPBACK_PORT).
 * @returns RouteGroup with Gemini-compatible endpoints.
 */
export function createGeminiProxyRoutes(
  modelRouter?: ModelRouterInterface,
  basePath: string = "",
  _loopbackPort: number = DEFAULT_LOOPBACK_PORT,
  runtimeConfigProvider?: ProxyRuntimeConfigProvider,
): RouteGroup {
  return {
    prefix: `${basePath}/v1beta`,
    routes: [
      // =================================================================
      // POST /v1beta/models/:model — covers both `:generateContent` and
      // `:streamGenerateContent`; the action lives inside the captured
      // segment, not in a second route (see splitModelAction above).
      // =================================================================
      {
        method: "POST",
        path: `${basePath}/v1beta/models/:model`,
        description:
          "Gemini-compatible generateContent / streamGenerateContent (translation mode)",
        handler: async (ctx: ServerContext) => {
          const requestModelRouter = runtimeConfigProvider
            ? runtimeConfigProvider().modelRouter
            : modelRouter;
          const requestStartTime = Date.now();

          // --- Split "<model>:<action>" out of the captured path segment ---
          const { modelId, action } = splitModelAction(ctx.path);

          if (!modelId || (action !== GENERATE && action !== STREAM_GENERATE)) {
            // Mirrors Google's own 404 shape so the CLI's error handling
            // (which parses `error.status`) sees a response it recognizes
            // instead of a bare proxy 404.
            return buildGeminiErrorResponse(
              404,
              `Unsupported Gemini endpoint: ${ctx.path}`,
              "NOT_FOUND",
            );
          }

          const body = ctx.body as Record<string, unknown> | undefined;

          // --- Validation ---
          if (
            !body ||
            !Array.isArray(body.contents) ||
            body.contents.length === 0
          ) {
            return buildGeminiErrorResponse(
              400,
              "Request must include a non-empty 'contents' array",
            );
          }

          const stream = action === STREAM_GENERATE;

          // --- Resolve target provider/model ---
          const route = requestModelRouter
            ? requestModelRouter.resolve(modelId)
            : { provider: null, model: modelId };
          const targetProvider = route.provider ?? undefined;
          const targetModel = route.model ?? modelId;

          logger.debug(
            `[proxy:gemini] ${modelId} → ${targetProvider ?? "auto"}/${targetModel}`,
          );

          // --- Parse request ---
          const parsed = parseGeminiRequest(targetModel, body, stream);

          // --- Build translation plan ---
          const adapted = adaptGeminiForTranslationPlan(parsed);
          const plan = buildProxyTranslationPlan(
            {
              provider: targetProvider ?? "auto",
              model: targetModel,
            },
            requestModelRouter?.getFallbackChain() ?? [],
            modelId,
            // The classifier only reads fields present across all three formats.
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
                model: modelId,
                stream,
                toolCount: Object.keys(parsed.tools).length,
                clientApp: "gemini-compat",
                userAgent: ctx.headers["user-agent"] ?? "",
                // Same reasoning as the OpenAI door: without an explicit
                // provider the tracer defaults to "anthropic" and prices a
                // Gemini model at Claude rates (or $0, off the anthropic
                // table's _default-less lookup).
                provider: targetProvider ?? "google-ai",
              },
              ctx.headers,
            );
            tracer.setMode("full");
          } catch {
            // Tracing is best-effort; continue without it.
          }

          // --- Dispatch via shared translation engine ---
          try {
            if (stream) {
              // Awaited, not returned bare: `handleTranslatedStreamRequest` is
              // async, so a rejection raised before the Response exists would
              // escape this try/catch and land in `app.onError`, which answers
              // in Anthropic's error shape. A Gemini client parsing that finds
              // no `error.message` and reports an empty failure.
              return await handleTranslatedStreamRequest({
                ctx,
                format: "gemini",
                requestModel: modelId,
                parsed,
                attempts,
                tracer,
                requestStartTime,
              });
            }

            return await handleTranslatedJsonRequest({
              ctx,
              format: "gemini",
              requestModel: modelId,
              parsed,
              attempts,
              tracer,
              requestStartTime,
            });
          } catch (err) {
            // Internal exception text (.message + any stack-trace remnants)
            // is kept ONLY in server-side logs + tracer. The client receives
            // a fixed generic message so internal paths/frames don't leak
            // back through the response body. (CodeQL: information exposure
            // through a stack trace.)
            const rawMessage = err instanceof Error ? err.message : String(err);
            const internalDetail = sanitizeForLog(rawMessage);
            logger.always(`[proxy:gemini] request failed: ${internalDetail}`);
            tracer?.setError("generation_error", internalDetail);
            tracer?.end(500, Date.now() - requestStartTime);
            return buildGeminiErrorResponse(
              500,
              "Internal proxy error",
              "INTERNAL",
            );
          }
        },
      },
    ],
  };
}

export const __testHooks = { splitModelAction, adaptGeminiForTranslationPlan };
