# 04 · LM Studio Provider — Implementation Spec

**Difficulty:** ⭐⭐ Medium. Closely mirrors `openaiCompatible.ts` auto-discovery + Ollama-style local-server error handling.

## Source-repo reference

- `/free-claude-code/providers/lmstudio/__init__.py` — `from .client import LMStudioProvider`
- `/free-claude-code/providers/lmstudio/client.py` (17 lines) — `LMStudioProvider(AnthropicMessagesTransport)`
- `/free-claude-code/providers/defaults.py:11` — `LMSTUDIO_DEFAULT_BASE = "http://localhost:1234/v1"`
- `/free-claude-code/providers/registry.py:73-81` — `static_credential="lm-studio"`, capabilities `("chat","streaming","tools","native_anthropic","local")`

**Note on transport:** the source repo uses `anthropic_messages` transport for LM Studio (assumes the local server exposes Anthropic's `/messages` endpoint). LM Studio's **standard documented API is OpenAI-compatible** (`/v1/chat/completions`), so our Neurolink port uses OpenAI-compat instead. This is the correct choice for the wider Neurolink user base.

## Wire-format facts

| Concern          | Value                                                                               |
| ---------------- | ----------------------------------------------------------------------------------- |
| Default base URL | `http://localhost:1234/v1`                                                          |
| Auth header      | `Authorization: Bearer lm-studio` (LM Studio ignores it; AI SDK requires non-empty) |
| Endpoint         | `POST /chat/completions`                                                            |
| Base URL env     | `LM_STUDIO_BASE_URL`                                                                |
| Streaming        | OpenAI-compat SSE                                                                   |
| Tool calling     | Yes — depends on the loaded model                                                   |
| Vision           | Yes — depends on the loaded model (LLaVA, Llama 3.2 Vision, etc.)                   |
| Models discovery | `GET /v1/models` returns currently loaded model(s)                                  |

## Models

LM Studio loads any GGUF model the user has downloaded. The provider has no hardcoded model list. If the user passes no model:

1. Call `/v1/models`
2. Use the first returned model id

This matches `openaiCompatible.ts` (lines 139-178) precisely.

## File: `src/lib/providers/lmStudio.ts` (NEW)

Mirror `src/lib/providers/openaiCompatible.ts` (443 lines), but:

- Hardcode the API key to `"lm-studio"` (or override via env)
- Default base URL: `http://localhost:1234/v1`
- Provider name: `"lm-studio"`
- Better error message for `ECONNREFUSED` (point user at LM Studio app's "Start Server" button)

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

const LM_STUDIO_DEFAULT_BASE_URL = "http://localhost:1234/v1";
const LM_STUDIO_PLACEHOLDER_KEY = "lm-studio";
const FALLBACK_MODEL = "local-model";

const getLmStudioBaseURL = (): string => {
  return process.env.LM_STUDIO_BASE_URL || LM_STUDIO_DEFAULT_BASE_URL;
};

/**
 * LM Studio Provider
 * Wraps the local LM Studio server (https://lmstudio.ai/) which exposes an
 * OpenAI-compatible API at http://localhost:1234/v1 by default.
 *
 * Auto-discovers the currently-loaded model via /v1/models if no model is specified.
 */
export class LMStudioProvider extends BaseProvider {
  private model?: LanguageModel;
  // Caller-supplied model name — captured at construction and never mutated,
  // so a discovery miss that calls `refreshHandlersForModel(FALLBACK_MODEL)`
  // can't poison the next call's explicit-vs-discover branch in
  // `getAISDKModel()`. See lmStudio.ts.
  private readonly requestedModelName?: string;
  private baseURL: string;
  private apiKey: string;
  private discoveredModel?: string;
  private lmstudioClient: ReturnType<typeof createOpenAI>;

  constructor(
    modelName?: string,
    sdk?: unknown,
    _region?: string,
    credentials?: NeurolinkCredentials["lmStudio"],
  ) {
    const validatedNeurolink =
      sdk && typeof sdk === "object" && "getInMemoryServers" in sdk
        ? sdk
        : undefined;

    super(
      modelName,
      "lm-studio" as AIProviderName,
      validatedNeurolink as NeuroLink | undefined,
    );
    this.requestedModelName = modelName;

    this.baseURL = credentials?.baseURL ?? getLmStudioBaseURL();
    // Honor per-call credentials → env → placeholder. The placeholder is fine
    // for vanilla local LM Studio (which ignores the key); set LM_STUDIO_API_KEY
    // or pass `credentials.lmStudio.apiKey` for auth-proxied deployments.
    this.apiKey =
      credentials?.apiKey ??
      process.env.LM_STUDIO_API_KEY ??
      LM_STUDIO_PLACEHOLDER_KEY;

    this.lmstudioClient = createOpenAI({
      baseURL: this.baseURL,
      apiKey: this.apiKey,
      fetch: createProxyFetch(),
    });

    logger.debug("LM Studio Provider initialized", {
      modelName: this.modelName,
      providerName: this.providerName,
      baseURL: this.baseURL,
    });
  }

  /**
   * Auto-discover loaded models via /v1/models.
   *
   * Use the proxy-aware fetch + bearer auth (when configured) and bound the
   * call with a short timeout — this is what production runtime does, so the
   * spec example matches it. Bare fetch(url) bypasses HTTPS_PROXY,
   * Authorization headers, and timeouts, and would mislead implementers.
   */
  private async getAvailableModels(): Promise<string[]> {
    const url = `${this.baseURL.replace(/\/$/, "")}/models`;
    const proxyFetch = createProxyFetch();
    const response = await proxyFetch(url, {
      headers:
        this.apiKey && this.apiKey !== LM_STUDIO_PLACEHOLDER_KEY
          ? { Authorization: `Bearer ${this.apiKey}` }
          : undefined,
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      throw new Error(
        `LM Studio /v1/models returned ${response.status}: ${response.statusText}`,
      );
    }
    const data = (await response.json()) as ModelsResponse;
    return data.data.map((m) => m.id);
  }

  protected async getAISDKModel(): Promise<LanguageModel> {
    if (this.model) return this.model;

    let modelToUse: string;
    // Use `this.requestedModelName` (constructor-captured, never mutated)
    // instead of `this.modelName` so a discovery miss can't poison the next
    // call's branch — `refreshHandlersForModel(FALLBACK_MODEL)` writes
    // `this.modelName`, which would otherwise look like an explicit user
    // choice and skip future `/v1/models` retries.
    const explicit = this.requestedModelName;
    if (explicit && explicit.trim() !== "") {
      modelToUse = explicit;
    } else {
      try {
        const models = await this.getAvailableModels();
        if (models.length > 0) {
          this.discoveredModel = models[0];
          modelToUse = this.discoveredModel;
          logger.info(
            `LM Studio auto-discovered model: ${modelToUse} (${models.length} loaded)`,
          );
        } else {
          modelToUse = FALLBACK_MODEL;
          logger.warn(
            `LM Studio /v1/models returned no models. Load a model in the LM Studio app.`,
          );
        }
      } catch (error) {
        logger.warn(
          `LM Studio model auto-discovery failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        modelToUse = FALLBACK_MODEL;
      }
    }

    this.refreshHandlersForModel(modelToUse);
    // .chat() targets /v1/chat/completions. The default factory call hits
    // the Responses API, which LM Studio doesn't expose.
    this.model = this.lmstudioClient.chat(modelToUse);
    return this.model;
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
            logger.warn("[LMStudioProvider] Failed to store tool executions", {
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
          requestId: `lmstudio-stream-${Date.now()}`,
          streamingMode: true,
        },
      );

      return {
        stream: transformedStream,
        provider: this.providerName,
        model: this.modelName || this.discoveredModel || FALLBACK_MODEL,
        analytics: analyticsPromise,
        metadata: { startTime, streamId: `lmstudio-${Date.now()}` },
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
    return process.env.LM_STUDIO_MODEL || "";
  }

  protected formatProviderError(error: unknown): Error {
    if (error instanceof TimeoutError) {
      return new Error(`LM Studio request timed out: ${error.message}`);
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
        `LM Studio server not reachable at ${this.baseURL}. ` +
          `Open the LM Studio app, load a model, and click "Start Server".`,
      );
    }
    if (message.includes("model_not_found") || message.includes("404")) {
      return new Error(
        `LM Studio model '${this.modelName}' is not loaded. Load it in the LM Studio app first.`,
      );
    }
    return new Error(`LM Studio error: ${message}`);
  }

  async validateConfiguration(): Promise<boolean> {
    try {
      const url = `${this.baseURL.replace(/\/$/, "")}/models`;
      // Mirror getAvailableModels() — proxy-aware fetch + bearer auth (when
      // configured) + bound timeout. A bare fetch(url) bypasses the proxy
      // layer and Authorization header, so reverse-proxied LM Studio fails
      // validation even though normal requests work.
      const proxyFetch = createProxyFetch();
      const r = await proxyFetch(url, {
        headers:
          this.apiKey && this.apiKey !== LM_STUDIO_PLACEHOLDER_KEY
            ? { Authorization: `Bearer ${this.apiKey}` }
            : undefined,
        signal: AbortSignal.timeout(5000),
      });
      return r.ok;
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

export default LMStudioProvider;
```

## Edge cases & special handling

1. **No model loaded**: `/v1/models` returns `{data: []}`. We fall back to `"local-model"` literal; the next request will fail with a clearer error from LM Studio.
2. **Server not running**: caught in `formatProviderError` via `ECONNREFUSED` → friendly "Start Server" message.
3. **API key**: the literal `"lm-studio"` placeholder works because vanilla LM Studio ignores it. The implementation also accepts a real key via `LM_STUDIO_API_KEY` env var or `credentials.lmStudio.apiKey`, which is forwarded as `Authorization: Bearer ...` for setups where LM Studio sits behind an auth-proxying reverse proxy.
4. **Vision**: works automatically when the loaded model supports it (LLaVA family, Llama 3.2 Vision). Image messages flow through `BaseProvider.buildMessagesForStream`.
5. **Tool calling**: same — depends on the loaded model. Newer Llama 3.x and Qwen models support it; older Mistral 7B variants don't.
6. **`embed()` / `embedMany()`**: LM Studio supports `/v1/embeddings` for embedding models. We DON'T implement `embed` in v1 to keep parity with `openaiCompatible.ts`. Add later if needed.

## Smoke test

```bash
# 1. Open LM Studio app, download a model (e.g. Llama 3.2 3B Instruct), click "Start Server"
pnpm run build:cli
pnpm run cli generate "Tell me a joke" --provider lm-studio
# Or specify model:
pnpm run cli generate "Hi" --provider lm-studio --model "llama-3.2-3b-instruct"
```

If LM Studio isn't running, expect: `LM Studio server not reachable at http://localhost:1234/v1. Open the LM Studio app, load a model, and click "Start Server".`

## Per-call credential override test

```ts
const nl = new NeuroLink();
const result = await nl.generate({
  input: { text: "hi" },
  provider: "lm-studio",
  credentials: { lmStudio: { baseURL: "http://192.168.1.5:1234/v1" } },
});
```

## Cross-references

- Shared file edits: `01-shared-changes.md` §1d (LMStudioModels enum), §2 (credentials), §3 (createLmStudioConfig), §4 (registry), §5 (barrel), §7 (context windows), §8 (vision), §9 (.env)
- Tests: `06-testing.md`
- Reference implementation: `src/lib/providers/openaiCompatible.ts` (auto-discovery pattern), `src/lib/providers/ollama.ts` (local-server error handling)
