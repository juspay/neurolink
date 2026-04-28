# 05 · llama.cpp Provider — Implementation Spec

**Difficulty:** ⭐⭐ Medium. Near-clone of LM Studio with different defaults and a `/health` check.

## Source-repo reference

- `/free-claude-code/providers/llamacpp/__init__.py` — `from .client import LlamaCppProvider`
- `/free-claude-code/providers/llamacpp/client.py` (17 lines) — `LlamaCppProvider(AnthropicMessagesTransport)`
- `/free-claude-code/providers/defaults.py:12` — `LLAMACPP_DEFAULT_BASE = "http://localhost:8080/v1"`
- `/free-claude-code/providers/registry.py:82-90` — `static_credential="llamacpp"`, capabilities `("chat","streaming","tools","native_anthropic","local")`

**Note on transport:** Same as LM Studio — the source repo uses Anthropic Messages transport, but llama.cpp's standard documented API is OpenAI-compatible. We use OpenAI-compat for our Neurolink port.

## Wire-format facts

| Concern          | Value                                                           |
| ---------------- | --------------------------------------------------------------- |
| Default base URL | `http://localhost:8080/v1`                                      |
| Auth header      | `Authorization: Bearer llamacpp` (placeholder; server ignores)  |
| Endpoint         | `POST /chat/completions`                                        |
| Health check     | `GET /health` (returns `{"status":"ok"}`)                       |
| Base URL env     | `LLAMACPP_BASE_URL`                                             |
| Streaming        | OpenAI-compat SSE                                               |
| Tool calling     | Limited — depends on the loaded model and `--jinja` template    |
| Vision           | Yes — if running with a multimodal model (LLaVA via `--mmproj`) |
| Models discovery | `GET /v1/models` returns the single loaded model                |

## Single-loaded-model behavior

Unlike LM Studio (which can switch models on-demand via the UI), `llama-server` loads ONE model at startup. `/v1/models` always returns the same model ID. The user changes models by restarting the server with a different `-m` flag.

## File: `src/lib/providers/llamaCpp.ts` (NEW)

Near-clone of `lmStudio.ts` (see `04-lm-studio.md`). Key differences:

- Default URL: `http://localhost:8080/v1`
- Provider name: `"llamacpp"`
- API key placeholder: `"llamacpp"` (real key optional via `LLAMACPP_API_KEY` env var or `credentials.llamacpp.apiKey` for reverse-proxy setups)
- Better error message: instructs user to run `./llama-server -m model.gguf --port 8080`
- Has a `/health` endpoint check in `validateConfiguration()`

```ts
import { createOpenAI } from "@ai-sdk/openai";
import { type LanguageModel, stepCountIs, streamText, type Tool } from "ai";
import type { AIProviderName } from "../constants/enums.js";
import { BaseProvider } from "../core/baseProvider.js";
import { DEFAULT_MAX_STEPS } from "../core/constants.js";
import { streamAnalyticsCollector } from "../core/streamAnalytics.js";
import type { NeuroLink } from "../neurolink.js";
import { createProxyFetch } from "../proxy/proxyFetch.js";
import type {
  UnknownRecord,
  NeurolinkCredentials,
  ModelsResponse,
  StreamOptions,
  StreamResult,
  ValidationSchema,
} from "../types/index.js";
import { emitToolEndFromStepFinish } from "../utils/toolEndEmitter.js";
import { logger } from "../utils/logger.js";
import {
  composeAbortSignals,
  createTimeoutController,
  TimeoutError,
} from "../utils/timeout.js";
import { resolveToolChoice } from "../utils/toolChoice.js";
import { toAnalyticsStreamResult } from "./providerTypeUtils.js";

const LLAMACPP_DEFAULT_BASE_URL = "http://localhost:8080/v1";
const LLAMACPP_PLACEHOLDER_KEY = "llamacpp";
const FALLBACK_MODEL = "loaded-model";

const getLlamaCppBaseURL = (): string => {
  return process.env.LLAMACPP_BASE_URL || LLAMACPP_DEFAULT_BASE_URL;
};

/**
 * llama.cpp Provider
 * Wraps a llama-server process (https://github.com/ggerganov/llama.cpp) which
 * exposes an OpenAI-compatible API at http://localhost:8080/v1 by default.
 *
 * llama-server hosts ONE model loaded at process startup; /v1/models returns
 * just that model's id.
 */
export class LlamaCppProvider extends BaseProvider {
  private model?: LanguageModel;
  private baseURL: string;
  private apiKey: string;
  private discoveredModel?: string;
  private llamaCppClient: ReturnType<typeof createOpenAI>;

  constructor(
    modelName?: string,
    sdk?: unknown,
    _region?: string,
    credentials?: NeurolinkCredentials["llamacpp"],
  ) {
    const validatedNeurolink =
      sdk && typeof sdk === "object" && "getInMemoryServers" in sdk
        ? sdk
        : undefined;

    super(
      modelName,
      "llamacpp" as AIProviderName,
      validatedNeurolink as NeuroLink | undefined,
    );

    this.baseURL = credentials?.baseURL ?? getLlamaCppBaseURL();
    this.apiKey = LLAMACPP_PLACEHOLDER_KEY;

    this.llamaCppClient = createOpenAI({
      baseURL: this.baseURL,
      apiKey: this.apiKey,
      fetch: createProxyFetch(),
    });

    logger.debug("llama.cpp Provider initialized", {
      modelName: this.modelName,
      providerName: this.providerName,
      baseURL: this.baseURL,
    });
  }

  private async getAvailableModels(): Promise<string[]> {
    const url = `${this.baseURL.replace(/\/$/, "")}/models`;
    // Proxy-aware fetch + bearer auth (when configured) + bound timeout —
    // matches the runtime so reverse-proxied/auth-gated llama-server
    // deployments still discover models.
    const proxyFetch = createProxyFetch();
    const response = await proxyFetch(url, {
      headers:
        this.apiKey && this.apiKey !== LLAMACPP_PLACEHOLDER_KEY
          ? { Authorization: `Bearer ${this.apiKey}` }
          : undefined,
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      throw new Error(
        `llama-server /v1/models returned ${response.status}: ${response.statusText}`,
      );
    }
    const data = (await response.json()) as ModelsResponse;
    return data.data.map((m) => m.id);
  }

  protected async getAISDKModel(): Promise<LanguageModel> {
    if (this.model) return this.model;

    let modelToUse: string;
    let discoverySucceeded = false;
    // Use `this.requestedModelName` (constructor-captured, never mutated)
    // instead of `this.modelName` so a discovery miss can't poison the next
    // call's branch — `refreshHandlersForModel(FALLBACK_MODEL)` writes
    // `this.modelName`, which would otherwise look like an explicit user
    // choice and skip future `/v1/models` retries.
    const explicit = this.requestedModelName;
    if (explicit && explicit.trim() !== "") {
      modelToUse = explicit;
      discoverySucceeded = true;
    } else {
      try {
        const models = await this.getAvailableModels();
        if (models.length > 0) {
          this.discoveredModel = models[0];
          modelToUse = this.discoveredModel;
          discoverySucceeded = true;
          logger.info(`llama.cpp loaded model: ${modelToUse}`);
        } else {
          modelToUse = FALLBACK_MODEL;
        }
      } catch (error) {
        logger.warn(
          `llama.cpp model discovery failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        modelToUse = FALLBACK_MODEL;
      }
    }

    // Refresh composed handlers (TelemetryHandler, MessageBuilder, …) so
    // pricing / span / log metadata reflects the discovered model.
    this.refreshHandlersForModel(modelToUse);
    // .chat() — llama-server exposes /v1/chat/completions, not /v1/responses.
    const resolvedModel = this.llamaCppClient.chat(modelToUse);
    // Memoize on success only — a discovery miss should let the next call
    // retry instead of being stuck on FALLBACK_MODEL for the instance lifetime.
    if (discoverySucceeded) {
      this.model = resolvedModel;
    }
    return resolvedModel;
  }

  protected async executeStream(
    options: StreamOptions,
    _analysisSchema?: ValidationSchema,
  ): Promise<StreamResult> {
    this.validateStreamOptions(options);

    const startTime = Date.now();
    const timeout = this.getTimeout(options);
    const timeoutController = createTimeoutController(
      timeout,
      this.providerName,
      "stream",
    );

    try {
      const shouldUseTools = !options.disableTools && this.supportsTools();
      const tools = shouldUseTools
        ? (options.tools as Record<string, Tool>) || (await this.getAllTools())
        : {};

      const messages = await this.buildMessagesForStream(options);
      const model = await this.getAISDKModelWithMiddleware(options);

      const result = await streamText({
        model,
        messages,
        temperature: options.temperature,
        maxOutputTokens: options.maxTokens,
        tools,
        stopWhen: stepCountIs(options.maxSteps || DEFAULT_MAX_STEPS),
        toolChoice: resolveToolChoice(options, tools, shouldUseTools),
        abortSignal: composeAbortSignals(
          options.abortSignal,
          timeoutController?.controller.signal,
        ),
        experimental_telemetry:
          this.telemetryHandler.getTelemetryConfig(options),
        experimental_repairToolCall: this.getToolCallRepairFn(options),
        onStepFinish: ({ toolCalls, toolResults }) => {
          emitToolEndFromStepFinish(
            this.neurolink?.getEventEmitter(),
            toolResults as Array<{
              toolName: string;
              output?: unknown;
              result?: unknown;
              error?: string;
            }>,
          );
          this.handleToolExecutionStorage(
            toolCalls,
            toolResults,
            options,
            new Date(),
          ).catch((error: unknown) => {
            logger.warn("[LlamaCppProvider] Failed to store tool executions", {
              provider: this.providerName,
              error: error instanceof Error ? error.message : String(error),
            });
          });
        },
      });

      timeoutController?.cleanup();
      const transformedStream = this.createTextStream(result);
      const analyticsPromise = streamAnalyticsCollector.createAnalytics(
        this.providerName,
        this.modelName || this.discoveredModel || FALLBACK_MODEL,
        toAnalyticsStreamResult(result),
        Date.now() - startTime,
        {
          requestId: `llamacpp-stream-${Date.now()}`,
          streamingMode: true,
        },
      );

      return {
        stream: transformedStream,
        provider: this.providerName,
        model: this.modelName || this.discoveredModel || FALLBACK_MODEL,
        analytics: analyticsPromise,
        metadata: { startTime, streamId: `llamacpp-${Date.now()}` },
      };
    } catch (error) {
      timeoutController?.cleanup();
      throw this.handleProviderError(error);
    }
  }

  protected getProviderName(): AIProviderName {
    return this.providerName;
  }

  protected getDefaultModel(): string {
    return process.env.LLAMACPP_MODEL || "";
  }

  protected formatProviderError(error: unknown): Error {
    if (error instanceof TimeoutError) {
      return new Error(`llama.cpp request timed out: ${error.message}`);
    }
    const errorRecord = error as UnknownRecord;
    const message =
      typeof errorRecord?.message === "string"
        ? errorRecord.message
        : "Unknown error";
    const cause = (errorRecord?.cause as UnknownRecord) ?? {};
    const code = (errorRecord?.code ?? cause?.code) as string | undefined;

    if (
      code === "ECONNREFUSED" ||
      message.includes("ECONNREFUSED") ||
      message.includes("Failed to fetch") ||
      message.includes("fetch failed")
    ) {
      return new Error(
        `llama.cpp server not reachable at ${this.baseURL}. ` +
          `Start it with: ./llama-server -m model.gguf --port 8080`,
      );
    }
    if (message.includes("400")) {
      return new Error(
        `llama.cpp rejected the request. Common causes: model doesn't support tools (start llama-server with --jinja for tool support).`,
      );
    }
    return new Error(`llama.cpp error: ${message}`);
  }

  async validateConfiguration(): Promise<boolean> {
    try {
      const healthURL = this.baseURL.replace(/\/v1\/?$/, "/health");
      const r = await fetch(healthURL);
      if (r.ok) return true;
      // Some llama-server builds don't expose /health; fall back to /v1/models
      const modelsURL = `${this.baseURL.replace(/\/$/, "")}/models`;
      const r2 = await fetch(modelsURL);
      return r2.ok;
    } catch {
      return false;
    }
  }

  getConfiguration() {
    return {
      provider: this.providerName,
      model: this.modelName || this.discoveredModel || FALLBACK_MODEL,
      defaultModel: this.getDefaultModel(),
      baseURL: this.baseURL,
    };
  }
}

export default LlamaCppProvider;
```

## Edge cases & special handling

1. **Server not running**: caught via `ECONNREFUSED` → message instructs user to run `./llama-server -m model.gguf --port 8080`.
2. **Tool calling**: llama.cpp supports OpenAI-style tools ONLY when started with `--jinja` (or with a model whose chat template includes tool support). If the user gets a 400 error, our `formatProviderError` surfaces a hint.
3. **Vision**: requires `--mmproj <projector>.gguf` flag at startup with a multimodal projector. The user must configure this on the server side.
4. **Single model**: changing models requires restarting the server. Document this in the provider docs.
5. **`/health` endpoint**: present in modern llama-server builds. Older builds may 404 — we fall back to `/v1/models` for the health check.
6. **Sampling extras**: llama.cpp supports many sampling parameters (`mirostat`, `repeat_penalty`, `top_k`, `n_predict`). For v1 we don't expose these; they can be set on the server side via `--sampling-config`. A future enhancement could thread them through `providerOptions.openai.body` like NIM.

## Smoke test

```bash
# Build llama.cpp from source, then:
./llama-server -m ~/models/llama-3.2-3b-instruct-q4_k_m.gguf --port 8080
# In another terminal:
pnpm run build:cli
pnpm run cli generate "Hello from llama.cpp" --provider llamacpp
# With tools (requires --jinja on the server):
./llama-server -m ~/models/llama-3.2-3b-instruct-q4_k_m.gguf --port 8080 --jinja
pnpm run cli generate "What's 17 factorial?" --provider llamacpp
```

## Per-call credential override test

```ts
const nl = new NeuroLink();
const result = await nl.generate({
  input: { text: "hi" },
  provider: "llamacpp",
  credentials: { llamacpp: { baseURL: "http://192.168.1.5:8080/v1" } },
});
```

## Cross-references

- Shared file edits: `01-shared-changes.md` §1e (LlamaCppModels enum), §2 (credentials), §3 (createLlamaCppConfig), §4 (registry), §5 (barrel), §7 (context windows), §8 (vision), §9 (.env)
- Tests: `06-testing.md`
- Reference implementation: `src/lib/providers/openaiCompatible.ts` (auto-discovery), `src/lib/providers/ollama.ts` (local-server error handling)
- Companion local provider: `04-lm-studio.md`
