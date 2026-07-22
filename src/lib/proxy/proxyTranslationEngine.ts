/**
 * Proxy Translation Engine
 *
 * Shared translation logic used by both Claude and OpenAI proxy routes.
 * Both formats follow the same pipeline:
 *   1. Parse request (format-specific, done by the caller)
 *   2. Loop through fallback attempts calling ctx.neurolink.stream()
 *   3. Serialize response (format-specific, via serializer/response builder)
 *
 * This module exports the helpers that were previously duplicated between
 * claudeProxyRoutes.ts and openaiProxyRoutes.ts, plus unified stream and
 * JSON handlers that accept a format discriminator.
 */

import {
  ClaudeStreamSerializer,
  generateToolUseId,
  serializeClaudeResponse,
} from "./claudeFormat.js";
import {
  generateOpenAIToolCallId,
  OpenAIStreamSerializer,
  serializeOpenAIResponse,
} from "./openaiFormat.js";
import type { ProxyTracer } from "./proxyTracer.js";
import { logRequest } from "./requestLogger.js";
import {
  recordAttempt,
  recordAttemptError,
  recordFinalError,
  recordFinalSuccess,
} from "./usageStats.js";
import type {
  InternalResult,
  ParsedClaudeRequest,
  ParsedOpenAIRequest,
  ProxyFormat,
  ProxyTranslationAttempt,
  ServerContext,
  StreamSerializerAdapter,
} from "../types/index.js";
import { ErrorCategory, ErrorSeverity } from "../constants/enums.js";
import { withTimeout } from "../utils/async/withTimeout.js";
import { ERROR_CODES, NeuroLinkError } from "../utils/errorHandling.js";
import { logger } from "../utils/logger.js";

// Upper bound on a single translation attempt. Long enough for slow upstreams
// (Vertex/LiteLLM can take 60–90s on big requests) but short enough that a
// hung provider can't stall the request handler indefinitely.
const TRANSLATION_ATTEMPT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/**
 * Extract text content from a stream chunk (handles various chunk formats).
 */
export function extractText(chunk: unknown): string | null {
  if (typeof chunk === "string") {
    return chunk;
  }

  if (chunk && typeof chunk === "object") {
    const c = chunk as Record<string, unknown>;

    // NeuroLink StreamResult chunk format: { content: string }
    if (typeof c.content === "string") {
      return c.content;
    }

    // Vercel AI SDK text delta format
    if (c.type === "text-delta" && typeof c.textDelta === "string") {
      return c.textDelta;
    }

    // Direct text field
    if (typeof c.text === "string") {
      return c.text;
    }
  }

  return null;
}

/** Extract tool call arguments from various shapes. */
export function extractToolArgs(toolCall: unknown): unknown {
  return (
    (toolCall as { args?: unknown }).args ??
    (toolCall as { parameters?: unknown }).parameters ??
    (toolCall as { input?: unknown }).input ??
    {}
  );
}

/** Check if there's meaningful output from translation. */
export function hasTranslatedOutput(
  collectedText: string,
  toolCalls: unknown[] | undefined,
): boolean {
  return collectedText.trim().length > 0 || (toolCalls?.length ?? 0) > 0;
}

/**
 * Normalize usage from various AI SDK / NeuroLink shapes.
 *
 * Handles:
 * - AI SDK v6: inputTokens / outputTokens
 * - AI SDK v4: promptTokens / completionTokens
 * - NeuroLink internal: input / output
 */
export function extractUsageFromStreamResult(usage: unknown): {
  input: number;
  output: number;
  total: number;
} {
  if (!usage || typeof usage !== "object") {
    return { input: 0, output: 0, total: 0 };
  }
  const u = usage as Record<string, unknown>;
  const input =
    (typeof u.inputTokens === "number" ? u.inputTokens : 0) ||
    (typeof u.promptTokens === "number" ? u.promptTokens : 0) ||
    (typeof u.input === "number" ? u.input : 0);
  const output =
    (typeof u.outputTokens === "number" ? u.outputTokens : 0) ||
    (typeof u.completionTokens === "number" ? u.completionTokens : 0) ||
    (typeof u.output === "number" ? u.output : 0);
  return { input, output, total: input + output };
}

// ---------------------------------------------------------------------------
// Format detection
// ---------------------------------------------------------------------------

/**
 * Detect which proxy format a request is using based on path and headers.
 */
export function detectProxyFormat(
  path: string,
  headers: Record<string, string>,
): ProxyFormat {
  // Path-based detection (primary, most reliable)
  if (path.includes("/chat/completions")) {
    return "openai";
  }
  if (path.includes("/messages")) {
    return "claude";
  }

  // Header-based fallback
  if (headers["anthropic-version"]) {
    return "claude";
  }
  if (headers["x-claude-code-session-id"]) {
    return "claude";
  }

  // Default to openai (more universal)
  return "openai";
}

// ---------------------------------------------------------------------------
// Provider/model-specific overrides for translated requests
// ---------------------------------------------------------------------------

function shouldOmitImagesForTarget(provider?: string, model?: string): boolean {
  // `open-large` in our LiteLLM setup handles text and tools, but returns an
  // empty completion when binary images are forwarded. Claude Code already
  // includes textual image markers in the prompt, so dropping only the binary
  // image payload keeps the request usable instead of breaking fallback.
  return provider === "litellm" && model === "open-large";
}

function shouldOmitThinkingConfigForTarget(
  provider?: string,
  model?: string,
): boolean {
  // LiteLLM speaks an OpenAI-shaped API and does not understand the Anthropic
  // `thinkingConfig` block — always strip it for litellm targets.
  if (provider === "litellm") {
    return true;
  }
  // For Vertex, only Gemini 2.5+ and 3.x support thinking on the wire.
  // Other Vertex models (text-bison, older Gemini, Claude-on-Vertex) reject
  // it, so omit for anything outside that allow-list.
  if (provider === "vertex") {
    const m = model?.toLowerCase() ?? "";
    return !/gemini-(2\.5|3)/.test(m);
  }
  // Other providers (anthropic, openai, etc.) either support it natively or
  // ignore unknown fields — pass it through.
  return false;
}

// ---------------------------------------------------------------------------
// Unified options builder
// ---------------------------------------------------------------------------

/**
 * Build options for ctx.neurolink.stream() from a parsed request
 * and an optional provider/model override.
 *
 * Works for both ParsedClaudeRequest and ParsedOpenAIRequest — the
 * only differences are Claude-specific fields (topK, thinkingConfig)
 * which are safely absent on OpenAI parsed requests.
 */
export function buildTranslationOptions(
  parsed: ParsedClaudeRequest | ParsedOpenAIRequest,
  overrides: { provider?: string; model?: string } = {},
): Record<string, unknown> {
  const historyMessages = parsed.conversationMessages.slice(0, -1);
  const toolNames = Object.keys(parsed.tools);

  // Claude-specific fields: topK and thinkingConfig
  const claudeParsed = parsed as Partial<ParsedClaudeRequest>;
  const images = shouldOmitImagesForTarget(overrides.provider, overrides.model)
    ? []
    : parsed.images;
  const thinkingConfig =
    claudeParsed.thinkingConfig &&
    !shouldOmitThinkingConfigForTarget(overrides.provider, overrides.model)
      ? claudeParsed.thinkingConfig
      : undefined;

  const toolChoice = parsed.toolChoiceName
    ? { type: "tool" as const, toolName: parsed.toolChoiceName }
    : parsed.toolChoice;

  return {
    input: {
      text: parsed.prompt,
      ...(images.length > 0 ? { images } : {}),
    },
    ...(overrides.provider ? { provider: overrides.provider } : {}),
    ...(overrides.model ? { model: overrides.model } : {}),
    systemPrompt: parsed.systemPrompt,
    ...(parsed.maxTokens !== undefined ? { maxTokens: parsed.maxTokens } : {}),
    ...(parsed.temperature !== undefined
      ? { temperature: parsed.temperature }
      : {}),
    ...(parsed.topP !== undefined ? { topP: parsed.topP } : {}),
    ...(claudeParsed.topK !== undefined ? { topK: claudeParsed.topK } : {}),
    ...(parsed.stopSequences?.length
      ? { stopSequences: parsed.stopSequences }
      : {}),
    ...(thinkingConfig ? { thinkingConfig } : {}),
    ...(toolNames.length === 0 ? { disableTools: true } : {}),
    ...(toolNames.length > 0
      ? {
          tools: parsed.tools,
          toolFilter: toolNames,
        }
      : {}),
    ...(toolChoice ? { toolChoice } : {}),
    ...(historyMessages.length > 0
      ? { conversationMessages: historyMessages }
      : {}),
    disableInternalFallback: true,
    skipToolPromptInjection: true,
    maxSteps: 1,
  };
}

// ---------------------------------------------------------------------------
// Serializer adapter — normalizes differences between Claude and OpenAI
// stream serializers behind a common interface.
// ---------------------------------------------------------------------------

function createClaudeSerializerAdapter(model: string): StreamSerializerAdapter {
  const inner = new ClaudeStreamSerializer(model, 0);
  return {
    start: () => inner.start(),
    pushDelta: (text) => inner.pushDelta(text),
    pushToolUse: (id, name, input) => inner.pushToolUse(id, name, input),
    finish: (finishReason, usage) => inner.finish(usage.output, finishReason),
    emitError: (message) => inner.emitError(500, message),
  };
}

function createOpenAISerializerAdapter(model: string): StreamSerializerAdapter {
  const inner = new OpenAIStreamSerializer(model);
  return {
    start: () => inner.start(),
    pushDelta: (text) => inner.pushDelta(text),
    pushToolUse: (id, name, input) => inner.pushToolUse(id, name, input),
    finish: (finishReason, usage) => inner.finish(finishReason, usage),
    emitError: (message) => inner.emitError(message),
  };
}

function generateToolId(format: ProxyFormat): string {
  return format === "claude" ? generateToolUseId() : generateOpenAIToolCallId();
}

function defaultFinishReason(format: ProxyFormat): string {
  return format === "claude" ? "end_turn" : "stop";
}

function logTag(format: ProxyFormat): string {
  return format === "claude" ? "[proxy]" : "[proxy:openai]";
}

// ---------------------------------------------------------------------------
// Unified streaming handler
// ---------------------------------------------------------------------------

/**
 * Handles a translated stream request for either Claude or OpenAI format.
 *
 * The streaming loop logic (iterate attempts, call neurolink.stream, collect
 * text, handle tool calls, keepalive timer) is identical across formats.
 * Only the serializer differs.
 */
export async function handleTranslatedStreamRequest(args: {
  ctx: ServerContext;
  format: ProxyFormat;
  requestModel: string;
  parsed: ParsedClaudeRequest | ParsedOpenAIRequest;
  attempts: ProxyTranslationAttempt[];
  tracer?: ProxyTracer;
  requestStartTime: number;
}): Promise<Response> {
  const {
    ctx,
    format,
    requestModel,
    parsed,
    attempts,
    tracer,
    requestStartTime,
  } = args;
  const tag = logTag(format);
  const serializer =
    format === "claude"
      ? createClaudeSerializerAdapter(requestModel)
      : createOpenAISerializerAdapter(requestModel);

  const KEEPALIVE_INTERVAL_MS = 15_000;
  const encoder = new TextEncoder();
  let keepAliveTimer: ReturnType<typeof setInterval> | undefined;
  let cancelled = false;
  let succeeded = false;
  let streamInterruptedAfterOutput = false;
  let translatedModel: string | undefined;
  let finalStreamError = "No translation providers succeeded";
  let upstreamIterator: AsyncIterator<unknown> | undefined;
  let lastAttemptLabel = "translation";

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // Emit opening frame
      for (const frame of serializer.start()) {
        controller.enqueue(encoder.encode(frame));
      }

      keepAliveTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keep-alive\n\n"));
        } catch {
          // Controller already closed.
        }
      }, KEEPALIVE_INTERVAL_MS);

      try {
        for (
          let attemptIndex = 0;
          attemptIndex < attempts.length;
          attemptIndex++
        ) {
          if (cancelled) {
            break;
          }
          const attempt = attempts[attemptIndex];
          lastAttemptLabel = attempt.label ?? "translation";
          logger.always(
            `[proxy:${format}] attempt ${attemptIndex + 1}/${attempts.length}: ${attempt.label}`,
          );
          recordAttempt(lastAttemptLabel, "translation");

          let collectedText = "";
          try {
            const options = buildTranslationOptions(
              parsed,
              attempt.provider
                ? { provider: attempt.provider, model: attempt.model }
                : {},
            );
            const streamResult = await withTimeout(
              ctx.neurolink.stream(
                options as Parameters<typeof ctx.neurolink.stream>[0],
              ),
              TRANSLATION_ATTEMPT_TIMEOUT_MS,
              `Translation attempt ${attempt.label} timed out after ${TRANSLATION_ATTEMPT_TIMEOUT_MS}ms`,
            );
            const iterable = streamResult.stream as AsyncIterable<unknown>;
            upstreamIterator = iterable[Symbol.asyncIterator]();

            while (true) {
              if (cancelled) {
                break;
              }
              const { value: chunk, done } = await upstreamIterator.next();
              if (done || cancelled) {
                break;
              }
              const text = extractText(chunk);
              if (text) {
                collectedText += text;
                for (const frame of serializer.pushDelta(text)) {
                  controller.enqueue(encoder.encode(frame));
                }
              }
            }

            if (cancelled) {
              return;
            }

            const toolCalls = streamResult.toolCalls ?? [];
            if (!hasTranslatedOutput(collectedText, toolCalls)) {
              finalStreamError = `Translated provider ${attempt.label} returned no content or tool calls`;
              logger.debug(
                `${tag} translation attempt ${attempt.label} returned no content or tool calls`,
              );
              recordAttemptError(lastAttemptLabel, "translation", 502);
              continue;
            }
            if (!cancelled && toolCalls.length) {
              for (const toolCall of toolCalls) {
                const toolName =
                  (toolCall as { toolName?: string }).toolName ??
                  (toolCall as { name?: string }).name ??
                  "unknown";
                const toolId =
                  (toolCall as { toolCallId?: string }).toolCallId ||
                  generateToolId(format);
                for (const frame of serializer.pushToolUse(
                  toolId,
                  toolName,
                  extractToolArgs(toolCall),
                )) {
                  controller.enqueue(encoder.encode(frame));
                }
              }
            }

            if (!cancelled) {
              const reason =
                streamResult.finishReason ?? defaultFinishReason(format);
              const resolvedUsage = extractUsageFromStreamResult(
                streamResult.usage,
              );
              for (const frame of serializer.finish(reason, resolvedUsage)) {
                controller.enqueue(encoder.encode(frame));
              }
            }

            // Track usage and metrics
            const resolvedUsageForTracer = extractUsageFromStreamResult(
              streamResult.usage,
            );
            tracer?.setUsage({
              inputTokens: resolvedUsageForTracer.input,
              outputTokens: resolvedUsageForTracer.output,
              cacheCreationTokens: 0,
              cacheReadTokens: 0,
            });
            tracer?.recordMetrics();

            translatedModel = streamResult.model;
            succeeded = true;
            return;
          } catch (streamErr) {
            if (cancelled) {
              return;
            }
            finalStreamError =
              streamErr instanceof Error
                ? streamErr.message
                : String(streamErr);
            if (collectedText.trim().length > 0) {
              streamInterruptedAfterOutput = true;
              recordAttemptError(lastAttemptLabel, "translation", 502);
              logger.always(`${tag} mid-stream error: ${finalStreamError}`);
              for (const frame of serializer.emitError(
                `Upstream stream interrupted: ${finalStreamError}`,
              )) {
                controller.enqueue(encoder.encode(frame));
              }
              return;
            }
            logger.debug(
              `${tag} translation attempt ${attempt.label} failed: ${finalStreamError}`,
            );
            recordAttemptError(lastAttemptLabel, "translation", 500);
          }
        }

        // All attempts exhausted
        if (!cancelled) {
          logger.always(
            `${tag} all translation attempts failed: ${finalStreamError}`,
          );
          for (const frame of serializer.emitError(finalStreamError)) {
            controller.enqueue(encoder.encode(frame));
          }
        }
      } finally {
        if (keepAliveTimer) {
          clearInterval(keepAliveTimer);
        }
        if (!cancelled) {
          controller.close();
        }
        if (tracer && translatedModel && translatedModel !== requestModel) {
          tracer.setModelSubstitution(requestModel, translatedModel);
        }
        const terminalStatus = cancelled
          ? 499
          : succeeded
            ? 200
            : streamInterruptedAfterOutput
              ? 502
              : 500;
        const terminalErrorType = cancelled
          ? "client_cancelled"
          : streamInterruptedAfterOutput
            ? "stream_error"
            : succeeded
              ? undefined
              : "generation_error";
        const terminalErrorMessage = cancelled
          ? "Client cancelled the streaming response"
          : succeeded
            ? undefined
            : finalStreamError;
        if (terminalErrorType && terminalErrorMessage) {
          tracer?.setError(
            terminalErrorType,
            terminalErrorMessage.slice(0, 500),
          );
          recordFinalError(terminalStatus, lastAttemptLabel, "translation", {
            requestId: ctx.requestId,
            errorType: terminalErrorType,
            terminalOutcome: terminalErrorType,
            message: terminalErrorMessage,
          });
        } else {
          recordFinalSuccess(lastAttemptLabel, "translation");
        }
        tracer?.end(terminalStatus, Date.now() - requestStartTime);

        const traceCtx = tracer?.getTraceContext();
        logRequest({
          timestamp: new Date().toISOString(),
          requestId: ctx.requestId,
          method: ctx.method,
          path: ctx.path,
          model: requestModel,
          stream: true,
          toolCount: Object.keys(parsed.tools).length,
          account: "translation",
          accountType: "translation",
          responseStatus: terminalStatus,
          responseTimeMs: Date.now() - requestStartTime,
          ...(terminalErrorType ? { errorType: terminalErrorType } : {}),
          ...(terminalErrorMessage
            ? { errorMessage: terminalErrorMessage.slice(0, 500) }
            : {}),
          ...(traceCtx?.traceId ? { traceId: traceCtx.traceId } : {}),
          ...(traceCtx?.spanId ? { spanId: traceCtx.spanId } : {}),
        });
      }
    },
    cancel() {
      cancelled = true;
      if (keepAliveTimer) {
        clearInterval(keepAliveTimer);
        keepAliveTimer = undefined;
      }
      if (upstreamIterator?.return) {
        upstreamIterator.return(undefined).catch((cancelErr) => {
          logger.debug(
            `${tag} upstream cancel error: ${cancelErr instanceof Error ? cancelErr.message : String(cancelErr)}`,
          );
        });
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
    },
  });
}

// ---------------------------------------------------------------------------
// Unified JSON (non-streaming) handler
// ---------------------------------------------------------------------------

/**
 * Handles a translated non-streaming request for either Claude or OpenAI format.
 */
export async function handleTranslatedJsonRequest(args: {
  ctx: ServerContext;
  format: ProxyFormat;
  requestModel: string;
  parsed: ParsedClaudeRequest | ParsedOpenAIRequest;
  attempts: ProxyTranslationAttempt[];
  tracer?: ProxyTracer;
  requestStartTime: number;
  terminalFailureStatus?: number;
}): Promise<unknown> {
  const {
    ctx,
    format,
    requestModel,
    parsed,
    attempts,
    tracer,
    requestStartTime,
    terminalFailureStatus = 500,
  } = args;
  const tag = logTag(format);
  let lastAttemptError = "No translation providers succeeded";
  let lastAttemptLabel = "translation";

  for (let attemptIndex = 0; attemptIndex < attempts.length; attemptIndex++) {
    const attempt = attempts[attemptIndex];
    lastAttemptLabel = attempt.label ?? "translation";
    logger.always(
      `[proxy:${format}] attempt ${attemptIndex + 1}/${attempts.length}: ${attempt.label}`,
    );
    recordAttempt(lastAttemptLabel, "translation");

    try {
      const options = buildTranslationOptions(
        parsed,
        attempt.provider
          ? { provider: attempt.provider, model: attempt.model }
          : {},
      );
      const streamResult = await withTimeout(
        ctx.neurolink.stream(
          options as Parameters<typeof ctx.neurolink.stream>[0],
        ),
        TRANSLATION_ATTEMPT_TIMEOUT_MS,
        `Translation attempt ${attempt.label} timed out after ${TRANSLATION_ATTEMPT_TIMEOUT_MS}ms`,
      );
      let collectedText = "";
      for await (const chunk of streamResult.stream) {
        const text = extractText(chunk);
        if (text) {
          collectedText += text;
        }
      }

      if (!hasTranslatedOutput(collectedText, streamResult.toolCalls)) {
        lastAttemptError = `Translated provider ${attempt.label} returned no content or tool calls`;
        logger.debug(
          `${tag} translation attempt ${attempt.label} returned no content or tool calls`,
        );
        recordAttemptError(lastAttemptLabel, "translation", 502);
        continue;
      }

      const internal: InternalResult = {
        content: collectedText,
        model: streamResult.model,
        finishReason: streamResult.finishReason ?? defaultFinishReason(format),
        reasoning: undefined,
        usage: streamResult.usage
          ? extractUsageFromStreamResult(streamResult.usage)
          : undefined,
        toolCalls: streamResult.toolCalls as InternalResult["toolCalls"],
      };

      // Track usage and metrics
      const resolvedUsage = extractUsageFromStreamResult(streamResult.usage);
      tracer?.setUsage({
        inputTokens: resolvedUsage.input,
        outputTokens: resolvedUsage.output,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
      });
      tracer?.recordMetrics();

      if (tracer && streamResult.model && streamResult.model !== requestModel) {
        tracer.setModelSubstitution(requestModel, streamResult.model);
      }
      tracer?.end(200, Date.now() - requestStartTime);

      recordFinalSuccess(lastAttemptLabel, "translation");

      const traceCtx = tracer?.getTraceContext();
      logRequest({
        timestamp: new Date().toISOString(),
        requestId: ctx.requestId,
        method: ctx.method,
        path: ctx.path,
        model: requestModel,
        stream: false,
        toolCount: Object.keys(parsed.tools).length,
        account: "translation",
        accountType: "translation",
        responseStatus: 200,
        responseTimeMs: Date.now() - requestStartTime,
        inputTokens: resolvedUsage.input,
        outputTokens: resolvedUsage.output,
        ...(traceCtx?.traceId ? { traceId: traceCtx.traceId } : {}),
        ...(traceCtx?.spanId ? { spanId: traceCtx.spanId } : {}),
      });

      return format === "claude"
        ? serializeClaudeResponse(internal, requestModel)
        : serializeOpenAIResponse(internal, requestModel);
    } catch (attemptError) {
      lastAttemptError =
        attemptError instanceof Error
          ? attemptError.message
          : String(attemptError);
      logger.debug(
        `${tag} translation attempt ${attempt.label} failed: ${lastAttemptError}`,
      );
      recordAttemptError(lastAttemptLabel, "translation", 500);
    }
  }

  recordFinalError(terminalFailureStatus, lastAttemptLabel, "translation", {
    requestId: ctx.requestId,
    errorType: "generation_error",
    terminalOutcome: "handler_error",
    message: lastAttemptError,
  });

  tracer?.setError("generation_error", lastAttemptError.slice(0, 500));
  tracer?.end(terminalFailureStatus, Date.now() - requestStartTime);

  const traceCtx = tracer?.getTraceContext();
  logRequest({
    timestamp: new Date().toISOString(),
    requestId: ctx.requestId,
    method: ctx.method,
    path: ctx.path,
    model: requestModel,
    stream: false,
    toolCount: Object.keys(parsed.tools).length,
    account: "translation",
    accountType: "translation",
    responseStatus: terminalFailureStatus,
    responseTimeMs: Date.now() - requestStartTime,
    errorType: "generation_error",
    errorMessage: lastAttemptError.slice(0, 500),
    ...(traceCtx?.traceId ? { traceId: traceCtx.traceId } : {}),
    ...(traceCtx?.spanId ? { spanId: traceCtx.spanId } : {}),
  });

  throw new NeuroLinkError({
    code: ERROR_CODES.PROVIDER_NOT_AVAILABLE,
    message: lastAttemptError,
    category: ErrorCategory.EXECUTION,
    severity: ErrorSeverity.HIGH,
    retriable: false,
    context: { attemptLabel: lastAttemptLabel, format },
  });
}

// ---------------------------------------------------------------------------
// Models list handler
// ---------------------------------------------------------------------------

/**
 * Build the /v1/models response in OpenAI list format.
 * Used by both Claude and OpenAI proxy routes.
 */
export function buildModelsListResponse(modelRouter?: {
  getModelMappings?: () => Array<{ from: string }>;
  getPassthroughModels?: () => string[];
}): {
  object: string;
  data: Array<{
    id: string;
    object: string;
    created: number;
    owned_by: string;
  }>;
} {
  const models: Array<{
    id: string;
    object: string;
    created: number;
    owned_by: string;
  }> = [];

  if (modelRouter) {
    const mappings = modelRouter.getModelMappings?.() ?? [];
    for (const m of mappings) {
      models.push({
        id: m.from,
        object: "model",
        created: 0,
        owned_by: "neurolink",
      });
    }

    const passthroughModels = modelRouter.getPassthroughModels?.() ?? [];
    for (const id of passthroughModels) {
      models.push({
        id,
        object: "model",
        created: 0,
        owned_by: "neurolink",
      });
    }
  }

  // Always include a default entry if nothing else is configured
  if (models.length === 0) {
    for (const id of DEFAULT_MODEL_IDS) {
      models.push({
        id,
        object: "model",
        created: 0,
        owned_by: "neurolink",
      });
    }
  }

  return {
    object: "list",
    data: models,
  };
}

/**
 * Canonical default model IDs surfaced when no router is configured. Format
 * matches the IDs used throughout `src/lib/models/` and `src/lib/constants/`
 * (e.g. `claude-3-5-haiku-20241022`, not `claude-haiku-3.5-20241022`).
 */
const DEFAULT_MODEL_IDS = [
  // Claude 4-series (current generation, hyphen-suffix family)
  "claude-opus-4-6",
  "claude-sonnet-4-6",
  "claude-haiku-4-5",
  // Claude 4 dated variant
  "claude-sonnet-4-20250514",
  // Claude 3.5-series (canonical Anthropic form: claude-3-5-{variant}-{date})
  "claude-3-5-sonnet-20241022",
  "claude-3-5-haiku-20241022",
  // OpenAI / Google for translated-fallback users
  "gpt-4o",
  "gemini-2.5-pro",
  "gemini-2.5-flash",
];

/**
 * Build an Anthropic-shaped `/v1/models` list response.
 *
 * Used by the Claude-compatible route so Anthropic SDK consumers receive
 * the schema they expect:
 *   { data: [{type, id, display_name, created_at}], first_id, last_id, has_more }
 *
 * The OpenAI route continues to use {@link buildModelsListResponse} for the
 * OpenAI list shape.
 */
export function buildAnthropicModelsListResponse(modelRouter?: {
  getModelMappings?: () => Array<{ from?: string }>;
  getPassthroughModels?: () => string[];
}): {
  data: Array<{
    type: "model";
    id: string;
    display_name: string;
    created_at: string;
  }>;
  first_id: string | null;
  last_id: string | null;
  has_more: boolean;
} {
  const ids: string[] = [];

  if (modelRouter) {
    const mappings = modelRouter.getModelMappings?.() ?? [];
    for (const m of mappings) {
      if (m.from) {
        ids.push(m.from);
      }
    }
    const passthrough = modelRouter.getPassthroughModels?.() ?? [];
    for (const id of passthrough) {
      ids.push(id);
    }
  }

  if (ids.length === 0) {
    ids.push(...DEFAULT_MODEL_IDS);
  }

  // Deduplicate while preserving order — multiple router sources can publish
  // the same id (e.g. both an explicit mapping and a passthrough entry).
  const seen = new Set<string>();
  const unique = ids.filter((id) => {
    if (seen.has(id)) {
      return false;
    }
    seen.add(id);
    return true;
  });

  const data = unique.map((id) => ({
    type: "model" as const,
    id,
    display_name: humanizeModelId(id),
    // Anthropic uses ISO-8601 timestamps. We don't have a real creation date
    // for proxy-published models, so anchor to the epoch — clients that care
    // about ordering have `first_id`/`last_id` instead.
    created_at: new Date(0).toISOString(),
  }));

  return {
    data,
    first_id: data[0]?.id ?? null,
    last_id: data[data.length - 1]?.id ?? null,
    has_more: false,
  };
}

/** Best-effort pretty name for a model id (e.g. `claude-3-5-haiku-20241022` -> `Claude 3.5 Haiku`). */
function humanizeModelId(id: string): string {
  // Drop the trailing date suffix if present (e.g. -20241022).
  const base = id.replace(/-\d{8}$/, "");
  // claude-3-5-haiku → ["claude", "3", "5", "haiku"] → "Claude 3.5 Haiku"
  const parts = base.split("-");
  const numericVersion: string[] = [];
  const words: string[] = [];
  for (const p of parts) {
    if (
      /^\d+$/.test(p) &&
      words.length > 0 &&
      words[0].toLowerCase() === "claude"
    ) {
      numericVersion.push(p);
    } else {
      words.push(p.charAt(0).toUpperCase() + p.slice(1));
    }
  }
  const versionPart =
    numericVersion.length > 0 ? ` ${numericVersion.join(".")}` : "";
  return words.length > 0
    ? `${words[0]}${versionPart}${words.slice(1).length ? " " + words.slice(1).join(" ") : ""}`
    : id;
}
